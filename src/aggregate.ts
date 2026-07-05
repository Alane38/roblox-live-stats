import type { AggregateStats, GameStats } from "./types";

/**
 * Additionne les stats d'un ensemble de jeux — fonction pure, aucune I/O.
 *
 * C'est ainsi qu'on calcule le CCU global d'un studio et ses visites totales :
 * une simple somme, jamais un appel réseau supplémentaire.
 */
export function aggregateStats(games: readonly GameStats[]): AggregateStats {
  return games.reduce<AggregateStats>(
    (acc, game) => ({
      totalVisits: acc.totalVisits + game.totalVisits,
      playersPlaying: acc.playersPlaying + game.playersPlaying,
      favoritedCount: acc.favoritedCount + game.favoritedCount,
      gameCount: acc.gameCount + 1,
    }),
    { totalVisits: 0, playersPlaying: 0, favoritedCount: 0, gameCount: 0 },
  );
}
