import type { z } from "zod";
import type { RateLimiter } from "./rate-limiter";
import { RobloxStatsError } from "./types";
import { delay } from "./utils";

export interface HttpClientDeps {
  limiter: RateLimiter;
  fetchImpl: typeof fetch;
  maxRetries: number;
  logger: (message: string) => void;
}

/**
 * Client HTTP rate-limité : récupère du JSON, réessaie sur 429/erreur réseau
 * avec backoff exponentiel, puis valide la réponse via un schéma Zod.
 */
export class HttpClient {
  constructor(private readonly deps: HttpClientDeps) {}

  async getJson<S extends z.ZodTypeAny>(
    url: string,
    schema: S,
  ): Promise<z.output<S>> {
    const response = await this.fetchWithRetry(url);
    if (!response.ok) {
      throw new RobloxStatsError(
        `Requête Roblox échouée (${response.status}) : ${url}`,
      );
    }
    const raw: unknown = await response.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new RobloxStatsError(
        `Réponse Roblox invalide : ${url}`,
        parsed.error,
      );
    }
    return parsed.data;
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    const { limiter, fetchImpl, maxRetries, logger } = this.deps;
    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      await limiter.acquire();
      try {
        const response = await fetchImpl(url);
        if (response.status !== 429) {
          limiter.resetBackoff();
          return response;
        }
        lastResponse = response;
        limiter.increaseBackoff();
        const backoff = Math.pow(2, attempt + 1) * 1000;
        logger(`[roblox] 429, retry ${attempt + 1}/${maxRetries} dans ${backoff}ms`);
        await delay(backoff);
      } catch (error) {
        logger(`[roblox] erreur réseau, retry ${attempt + 1}/${maxRetries}`);
        if (attempt === maxRetries - 1) {
          throw new RobloxStatsError(`Échec réseau : ${url}`, error);
        }
        await delay(Math.pow(2, attempt) * 1000);
      }
    }

    if (lastResponse) return lastResponse;
    throw new RobloxStatsError(`Échec après ${maxRetries} tentatives : ${url}`);
  }
}
