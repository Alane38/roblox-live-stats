import type { HttpClient } from "./http";
import {
  gamesResponseSchema,
  thumbnailsResponseSchema,
  universeResponseSchema,
  votesResponseSchema,
  type GameDetails,
  type Vote,
} from "./schemas";

const HOST = {
  games: "https://games.roblox.com",
  thumbnails: "https://thumbnails.roblox.com",
  apis: "https://apis.roblox.com",
} as const;

const DEFAULT_THUMBNAIL =
  "https://www.roblox.com/asset-thumbnail/image?assetId=1&width=768&height=432&format=png";

/** Convertit un PlaceId (ID de l'URL) en UniverseId (ID interne des stats). */
export async function fetchUniverseId(
  http: HttpClient,
  place: number,
): Promise<number> {
  const url = `${HOST.apis}/universes/v1/places/${place}/universe`;
  const data = await http.getJson(url, universeResponseSchema);
  return data.universeId;
}

/** Détails (nom, CCU, visites, favoris…) pour un lot d'univers (≤ 10 conseillé). */
export async function fetchDetailsBatch(
  http: HttpClient,
  ids: readonly number[],
): Promise<Map<number, GameDetails>> {
  const url = `${HOST.games}/v1/games?universeIds=${ids.join(",")}`;
  const data = await http.getJson(url, gamesResponseSchema);
  return new Map(data.data.map((game) => [game.id, game]));
}

/** Votes (likes / dislikes) pour un lot d'univers. */
export async function fetchVotesBatch(
  http: HttpClient,
  ids: readonly number[],
): Promise<Map<number, Vote>> {
  const url = `${HOST.games}/v1/games/votes?universeIds=${ids.join(",")}`;
  const data = await http.getJson(url, votesResponseSchema);
  return new Map(data.data.map((vote) => [vote.id, vote]));
}

/** Miniatures (image de couverture) pour un lot d'univers. */
export async function fetchThumbnailsBatch(
  http: HttpClient,
  ids: readonly number[],
): Promise<Map<number, string>> {
  const params = new URLSearchParams({
    universeIds: ids.join(","),
    countPerUniverse: "1",
    defaults: "true",
    size: "768x432",
    format: "Png",
    isCircular: "false",
  });
  const url = `${HOST.thumbnails}/v1/games/multiget/thumbnails?${params}`;
  const data = await http.getJson(url, thumbnailsResponseSchema);
  return new Map(
    data.data.map((item) => [
      item.universeId,
      item.thumbnails[0]?.imageUrl ?? DEFAULT_THUMBNAIL,
    ]),
  );
}
