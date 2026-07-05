import {
  RobloxStatsClient,
  aggregateStats,
  placeId,
  universeId,
} from "@newalfox/roblox-live-stats";

const client = new RobloxStatsClient({
  cacheTtlMs: 60_000, // garde chaque jeu en cache 60s
  logger: console.log, // décommenter pour voir les retries 429
});

// 1. À partir de l'ID du lien du jeu (PlaceId) → UniverseId
const universe = await client.resolveUniverseId(placeId(920587237));

// 2. Stats d'un seul jeu
const game = await client.getGame(universe);
console.log(`${game.title} — ${game.playersPlaying} joueurs en ligne`);

// 3. Plusieurs jeux d'un coup (batch + cache automatiques)
const games = await client.getGames([
  universeId(994732206),
  universeId(245662005),
]);

// 4. Totaux du studio : CCU global + visites totales (somme pure, 0 appel réseau)
const totals = aggregateStats(games);
console.log(`CCU global : ${totals.playersPlaying}`);
console.log(`Visites totales : ${totals.totalVisits}`);
