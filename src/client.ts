import { aggregateStats } from "./aggregate";
import { TtlCache } from "./cache";
import { HttpClient } from "./http";
import { RateLimiter } from "./rate-limiter";
import type { GameDetails, Vote } from "./schemas";
import {
  fetchDetailsBatch,
  fetchThumbnailsBatch,
  fetchUniverseId,
  fetchVotesBatch,
} from "./roblox-api";
import {
  placeId as toPlaceId,
  universeId as toUniverseId,
  type AggregateStats,
  type GameStats,
  type PlaceId,
  type RobloxStatsClientOptions,
  type UniverseId,
} from "./types";
import { chunk, cleanDescription, delay, unique } from "./utils";

const DEFAULTS = {
  minIntervalMs: 500,
  cacheTtlMs: 60_000,
  maxRetries: 4,
  batchSize: 10,
  batchDelayMs: 2000,
} as const;

/**
 * Client Roblox temps réel. Batch + rate limiting + cache mémoire, le tout
 * sans dépendance framework : à brancher dans Next.js, un serveur Node, un cron…
 */
export class RobloxStatsClient {
  private readonly http: HttpClient;
  private readonly cache: TtlCache<GameStats>;
  private readonly batchSize: number;
  private readonly batchDelayMs: number;

  constructor(options: RobloxStatsClientOptions = {}) {
    const minIntervalMs = options.minIntervalMs ?? DEFAULTS.minIntervalMs;
    this.batchSize = options.batchSize ?? DEFAULTS.batchSize;
    this.batchDelayMs = options.batchDelayMs ?? DEFAULTS.batchDelayMs;
    this.cache = new TtlCache<GameStats>(
      options.cacheTtlMs ?? DEFAULTS.cacheTtlMs,
    );
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new TypeError(
        "Aucun `fetch` disponible. Node < 18 : passez `options.fetch`.",
      );
    }
    this.http = new HttpClient({
      limiter: new RateLimiter(minIntervalMs),
      fetchImpl,
      maxRetries: options.maxRetries ?? DEFAULTS.maxRetries,
      logger: options.logger ?? (() => undefined),
    });
  }

  /** Convertit un PlaceId (ID du lien du jeu) en UniverseId (ID des stats). */
  async resolveUniverseId(place: PlaceId | number): Promise<UniverseId> {
    const id = await fetchUniverseId(this.http, toPlaceId(place));
    return toUniverseId(id);
  }

  /** Récupère les stats d'un seul jeu. */
  async getGame(universe: UniverseId | number): Promise<GameStats> {
    const [game] = await this.getGames([toUniverseId(universe)]);
    if (!game) {
      throw new Error(`Aucune donnée pour l'univers ${universe}`);
    }
    return game;
  }

  /**
   * Récupère les stats de plusieurs jeux. Sert le cache quand c'est possible,
   * regroupe les manquants en lots, et dégrade gracieusement : un lot en échec
   * est ignoré (loggé) plutôt que de faire planter l'ensemble.
   */
  async getGames(
    universes: readonly (UniverseId | number)[],
  ): Promise<GameStats[]> {
    const ids = unique(universes.map((u) => toUniverseId(u) as number));
    const missing = ids.filter((id) => !this.cache.get(String(id)));

    if (missing.length > 0) {
      await this.refresh(missing);
    }

    return ids
      .map((id) => this.cache.get(String(id)))
      .filter((game): game is GameStats => game !== null);
  }

  /** Force le rafraîchissement des jeux donnés depuis l'API et met à jour le cache. */
  async refresh(universes: readonly (UniverseId | number)[]): Promise<void> {
    const ids = unique(universes.map((u) => toUniverseId(u) as number));
    const batches = chunk(ids, this.batchSize);

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i]!;
      try {
        const [details, votes, thumbnails] = await Promise.all([
          fetchDetailsBatch(this.http, batch),
          fetchVotesBatch(this.http, batch),
          fetchThumbnailsBatch(this.http, batch),
        ]);
        for (const universeId of batch) {
          const detail = details.get(universeId);
          if (!detail) continue;
          const stats = this.combine(
            universeId,
            detail,
            votes.get(universeId),
            thumbnails.get(universeId),
          );
          this.cache.set(String(universeId), stats);
        }
      } catch (error) {
        console.error(`[roblox] lot ${i + 1}/${batches.length} en échec:`, error);
      }
      if (i < batches.length - 1) await delay(this.batchDelayMs);
    }
  }

  /** Agrège (CCU global, visites totales…) les jeux donnés. */
  async getAggregate(
    universes: readonly (UniverseId | number)[],
  ): Promise<AggregateStats> {
    return aggregateStats(await this.getGames(universes));
  }

  clearCache(): void {
    this.cache.clear();
  }

  private combine(
    universeId: number,
    detail: GameDetails,
    vote: Vote | undefined,
    thumbnail: string | undefined,
  ): GameStats {
    return {
      universeId,
      placeId: detail.rootPlaceId,
      title: detail.name,
      description: cleanDescription(detail.description),
      imageUrl: thumbnail ?? "",
      owner: detail.creator.name,
      playersPlaying: detail.playing,
      totalVisits: detail.visits,
      favoritedCount: detail.favoritedCount,
      upVotes: vote?.upVotes ?? 0,
      downVotes: vote?.downVotes ?? 0,
    };
  }
}
