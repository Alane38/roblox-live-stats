# @newalfox/roblox-live-stats

> Stats de jeux **Roblox en temps réel** (CCU, visites, favoris, votes) — batch, rate limiting adaptatif et cache mémoire. Framework-agnostic, TypeScript strict, une seule dépendance.

Extrait du système temps réel de [aetron.studio](https://aetron.studio), packagé pour être réutilisable partout.

```bash
pnpm add @newalfox/roblox-live-stats
# ou : npm i @newalfox/roblox-live-stats · yarn add @newalfox/roblox-live-stats
```

---

## Pourquoi

Roblox n'a pas d'API « donne-moi tout ». Il faut taper plusieurs endpoints, recoller les morceaux, et **surtout ne jamais appeler Roblox à chaque visiteur** — sinon c'est lent et l'API te bloque (429). Ce package encapsule les trois briques qui rendent le tout rapide et stable :

- **Batch** — jusqu'à 10 jeux par requête au lieu d'un.
- **Rate limiter adaptatif** — un délai minimum entre appels, avec backoff exponentiel qui s'allonge sur 429 et se réinitialise au succès.
- **Cache mémoire TTL** — sert la dernière « photo » connue instantanément.

Tu branches ta propre base de données et tes routes par-dessus. Le package reste pur.

## Démarrage

```ts
import { RobloxStatsClient, aggregateStats, placeId, universeId } from "@newalfox/roblox-live-stats";

const client = new RobloxStatsClient({ cacheTtlMs: 60_000 });

// PlaceId (l'ID de l'URL du jeu) → UniverseId (l'ID interne des stats)
const universe = await client.resolveUniverseId(placeId(920587237));

// Un jeu
const game = await client.getGame(universe);
console.log(game.title, game.playersPlaying); // "Nom du jeu", CCU en direct

// Plusieurs jeux (batch + cache automatiques)
const games = await client.getGames([universeId(994732206), universeId(245662005)]);

// Totaux du studio : CCU global + visites totales (somme pure, 0 appel réseau)
const totals = aggregateStats(games);
console.log(totals.playersPlaying, totals.totalVisits);
```

### Types nominaux : impossible de confondre les IDs

Le piège n°1 de l'API Roblox est d'envoyer un `PlaceId` là où un `UniverseId` est attendu. Ici c'est bloqué **à la compilation** grâce aux branded types :

```ts
client.getGame(placeId(123)); // ❌ erreur TypeScript
client.getGame(universeId(123)); // ✅
```

## Exemple Next.js (App Router)

Deux routes : une pour les jeux, une pour les totaux. Le cache du client évite de retaper Roblox à chaque requête.

```ts
// app/api/games/route.ts
import { NextResponse } from "next/server";
import { RobloxStatsClient, universeId } from "@newalfox/roblox-live-stats";

const client = new RobloxStatsClient({ cacheTtlMs: 60_000 });
const UNIVERSES = [universeId(994732206), universeId(245662005)];

export async function GET() {
  const games = await client.getGames(UNIVERSES);
  return NextResponse.json({ games });
}
```

```ts
// app/api/stats/route.ts
import { NextResponse } from "next/server";
import { RobloxStatsClient, universeId } from "@newalfox/roblox-live-stats";

const client = new RobloxStatsClient({ cacheTtlMs: 60_000 });
const UNIVERSES = [universeId(994732206), universeId(245662005)];

export async function GET() {
  return NextResponse.json(await client.getAggregate(UNIVERSES));
}
```

Côté client, un `setInterval` toutes les 5 s sur ces routes suffit à créer l'effet « live ».

## API

### `new RobloxStatsClient(options?)`

| Option          | Défaut  | Rôle                                                    |
| --------------- | ------- | ------------------------------------------------------- |
| `minIntervalMs` | `500`   | Délai minimum entre deux appels Roblox.                 |
| `cacheTtlMs`    | `60000` | TTL du cache par jeu. `0` désactive le cache.           |
| `maxRetries`    | `4`     | Tentatives avant abandon (429 / réseau).                |
| `batchSize`     | `10`    | IDs max par requête batch.                              |
| `batchDelayMs`  | `2000`  | Pause entre deux lots.                                  |
| `fetch`         | global  | Implémentation `fetch` (utile sur Node < 18).           |
| `logger`        | —       | Callback de log (ex. `console.log`) pour voir les 429.  |

### Méthodes

| Méthode                        | Retour                    | Description                                            |
| ------------------------------ | ------------------------- | ----------------------------------------------------- |
| `resolveUniverseId(place)`     | `Promise<UniverseId>`     | PlaceId → UniverseId.                                  |
| `getGame(universe)`            | `Promise<GameStats>`      | Stats d'un jeu.                                        |
| `getGames(universes)`          | `Promise<GameStats[]>`    | Stats de plusieurs jeux (cache + batch + dégradation).|
| `getAggregate(universes)`      | `Promise<AggregateStats>` | Totaux (CCU global, visites…).                        |
| `refresh(universes)`           | `Promise<void>`           | Force le rafraîchissement du cache.                   |
| `clearCache()`                 | `void`                    | Vide le cache.                                         |

### `aggregateStats(games): AggregateStats`

Fonction **pure** : additionne `playersPlaying` (CCU global), `totalVisits`, `favoritedCount` et compte les jeux. Aucune I/O.

## Données renvoyées (`GameStats`)

`universeId`, `placeId`, `title`, `description`, `imageUrl`, `owner`, `playersPlaying` (CCU), `totalVisits`, `favoritedCount`, `upVotes`, `downVotes`.

## Le flux, de bout en bout

```
Roblox API ──(robot 60s)──▶ Cache/DB ──(instantané)──▶ Ton API ──(poll 5s)──▶ Site
```

## Développement

```bash
pnpm install
pnpm build       # ESM + CJS + types (dist/)
pnpm typecheck
```

## Licence

MIT © [Alane (newalfox)](https://github.com/Alane38). Si ce package t'aide, une étoile ⭐ ou un crédit fait plaisir.
