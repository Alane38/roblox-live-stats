/**
 * Types du domaine — 0 dépendance, 0 I/O.
 *
 * Les IDs Roblox sont typés nominalement (branded types) : un `PlaceId` (l'ID
 * visible dans l'URL d'un jeu) ne peut pas être confondu avec un `UniverseId`
 * (l'ID interne dont dépendent les stats). C'est la source de bug n°1 de
 * l'API Roblox, éliminée à la compilation.
 */

declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UniverseId = Brand<number, "UniverseId">;
export type PlaceId = Brand<number, "PlaceId">;

function assertPositiveInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} doit être un entier positif, reçu: ${value}`);
  }
}

/** Construit un `UniverseId` validé à partir d'un nombre. */
export function universeId(value: number): UniverseId {
  assertPositiveInt(value, "UniverseId");
  return value as UniverseId;
}

/** Construit un `PlaceId` validé à partir d'un nombre. */
export function placeId(value: number): PlaceId {
  assertPositiveInt(value, "PlaceId");
  return value as PlaceId;
}

/** Stats complètes d'un jeu Roblox à un instant T. */
export interface GameStats {
  /** ID interne de l'univers Roblox. */
  universeId: number;
  /** ID racine du jeu (celui de l'URL). */
  placeId: number;
  title: string;
  description: string;
  imageUrl: string;
  owner: string;
  /** Joueurs connectés en direct (CCU). */
  playersPlaying: number;
  /** Visites cumulées depuis la création du jeu. */
  totalVisits: number;
  favoritedCount: number;
  upVotes: number;
  downVotes: number;
}

/** Totaux agrégés sur un ensemble de jeux (ex. tout un studio). */
export interface AggregateStats {
  /** Somme des visites de tous les jeux. */
  totalVisits: number;
  /** CCU global : somme des joueurs connectés sur tous les jeux. */
  playersPlaying: number;
  /** Somme des favoris. */
  favoritedCount: number;
  /** Nombre de jeux pris en compte. */
  gameCount: number;
}

export interface RobloxStatsClientOptions {
  /** Délai minimum entre deux appels à l'API Roblox (ms). Défaut : 500. */
  minIntervalMs?: number;
  /** Durée de vie du cache mémoire par jeu (ms). Défaut : 60000. `0` = désactivé. */
  cacheTtlMs?: number;
  /** Nombre de tentatives avant d'abandonner sur erreur 429/réseau. Défaut : 4. */
  maxRetries?: number;
  /** Nombre max d'IDs par requête batch. Défaut : 10. */
  batchSize?: number;
  /** Délai entre deux lots batch (ms). Défaut : 2000. */
  batchDelayMs?: number;
  /** Implémentation de `fetch` à utiliser (défaut : le `fetch` global). */
  fetch?: typeof fetch;
  /** Callback de log optionnel (ex. `console.log`). Silencieux par défaut. */
  logger?: (message: string) => void;
}

/** Erreur levée par le client pour toute défaillance non récupérable. */
export class RobloxStatsError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RobloxStatsError";
  }
}
