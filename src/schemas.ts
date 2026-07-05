/**
 * Schémas Zod — validation obligatoire à la frontière de l'API Roblox.
 * On ne caste jamais la réponse : on la *prouve*.
 */
import { z } from "zod";

export const gameDetailsSchema = z.object({
  id: z.number(),
  rootPlaceId: z.number(),
  name: z.string(),
  description: z.string().nullish().transform((v) => v ?? ""),
  creator: z.object({ name: z.string() }).partial().transform((c) => ({
    name: c.name ?? "Unknown",
  })),
  playing: z.number().default(0),
  visits: z.number().default(0),
  favoritedCount: z.number().default(0),
});

export const gamesResponseSchema = z.object({
  data: z.array(gameDetailsSchema).default([]),
});

export const voteSchema = z.object({
  id: z.number(),
  upVotes: z.number().default(0),
  downVotes: z.number().default(0),
});

export const votesResponseSchema = z.object({
  data: z.array(voteSchema).default([]),
});

export const thumbnailItemSchema = z.object({
  universeId: z.number(),
  thumbnails: z
    .array(z.object({ imageUrl: z.string() }))
    .default([]),
});

export const thumbnailsResponseSchema = z.object({
  data: z.array(thumbnailItemSchema).default([]),
});

export const universeResponseSchema = z.object({
  universeId: z.number(),
});

export type GameDetails = z.infer<typeof gameDetailsSchema>;
export type Vote = z.infer<typeof voteSchema>;
export type ThumbnailItem = z.infer<typeof thumbnailItemSchema>;
