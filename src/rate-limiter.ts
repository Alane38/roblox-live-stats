import { delay } from "./utils";

/**
 * Portier global : garantit un délai minimum entre TOUS les appels réseau,
 * avec un backoff exponentiel qui s'allonge à chaque erreur 429 puis se
 * réinitialise dès qu'une requête réussit. C'est ce qui évite le blocage.
 */
export class RateLimiter {
  private lastCallTime = 0;
  private consecutiveErrors = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly minIntervalMs: number) {}

  /** Attend le créneau autorisé avant de rendre la main. Sérialise les appels. */
  acquire(): Promise<void> {
    const next = this.chain.then(() => this.waitForSlot());
    this.chain = next.catch(() => undefined);
    return next;
  }

  increaseBackoff(): void {
    this.consecutiveErrors += 1;
  }

  resetBackoff(): void {
    this.consecutiveErrors = 0;
  }

  private async waitForSlot(): Promise<void> {
    const effectiveInterval =
      this.minIntervalMs * Math.pow(1.5, this.consecutiveErrors);
    const elapsed = Date.now() - this.lastCallTime;
    const waitTime = Math.max(0, effectiveInterval - elapsed);
    if (waitTime > 0) await delay(waitTime);
    this.lastCallTime = Date.now();
  }
}
