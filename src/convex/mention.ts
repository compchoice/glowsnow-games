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

/** Escape a string so it can be dropped into a RegExp as a literal. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const matchers = new Map<string, RegExp>();

/**
 * A whole-word matcher for one name, built once and cached: the tray tests the
 * same couple of needles against every recent message.
 *
 * The word boundaries are the point. A plain substring test means a member named
 * "Ann" gets a notification every time somebody writes "annoying", and "Jo"
 * fires on "joke".
 */
function matcherFor(needle: string): RegExp {
  const key = needle.trim().toLowerCase();
  let matcher = matchers.get(key);
  if (!matcher) {
    matcher = new RegExp(
      `(^|[^\\p{L}\\p{N}_])${escapeRegExp(key)}(?![\\p{L}\\p{N}_])`,
      "u",
    );
    matchers.set(key, matcher);
  }
  return matcher;
}

/** True when a chat message mentions the member as a whole word. */
export function isMentioned(body: string, needles: string[]): boolean {
  if (needles.length === 0) return false;
  const haystack = body.toLowerCase();
  return needles.some((needle) => matcherFor(needle).test(haystack));
}
