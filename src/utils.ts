/** Découpe un tableau en lots de taille `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new RangeError("chunk: size doit être > 0");
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/** Retire les tags HTML et limite la longueur d'une description Roblox. */
export function cleanDescription(raw: string, maxLength = 500): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .trim()
    .substring(0, maxLength);
}

/** Promesse résolue après `ms` millisecondes. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Déduplique en préservant l'ordre de première apparition. */
export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}
