/**
 * @newalfox/roblox-live-stats
 * Stats de jeux Roblox en temps réel — batch, rate limiting, cache.
 *
 * @author Alane (newalfox)
 * @license MIT
 */
export { RobloxStatsClient } from "./client";
export { aggregateStats } from "./aggregate";
export {
  placeId,
  universeId,
  RobloxStatsError,
  type AggregateStats,
  type Brand,
  type GameStats,
  type PlaceId,
  type RobloxStatsClientOptions,
  type UniverseId,
} from "./types";
