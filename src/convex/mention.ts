/**
 * Mention matching for chat notifications. Kept as a plain module (no Convex
 * imports) so the rules can be unit tested directly.
 */

/**
 * The names that count as a mention for a member. Guests are anonymous and
 * short names are too noisy to match, so both return no needles.
 */
export function mentionNeedles(name: string, isAnonymous: boolean): string[] {
  if (isAnonymous) return [];
  const full = name.trim().toLowerCase();
  if (full.length < 3) return [];

  const needles = new Set<string>([full]);
  const first = full.split(/\s+/)[0];
  if (first.length >= 3) needles.add(first);
  return [...needles];
}

/** True when a chat message contains any of the member's names. */
export function isMentioned(body: string, needles: string[]): boolean {
  if (needles.length === 0) return false;
  const haystack = body.toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}
