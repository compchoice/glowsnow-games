export type MemberLike = { _id: string; name: string };

/** Strips a leading colon so `ban:ana` works as well as `ban ana`. */
function normalize(needle: string): string {
  return needle.trim().replace(/^:+/, "").toLowerCase();
}

/** Everyone whose name contains the needle, for "did you mean" output. */
export function searchMembers<T extends MemberLike>(
  needle: string,
  members: T[],
): T[] {
  const q = normalize(needle);
  if (!q) return [];
  return members.filter((member) => member.name.toLowerCase().includes(q));
}

/**
 * Finds one member by id, exact name, or a unique prefix. Returns null when
 * nothing matches or when the name is ambiguous — the caller should show the
 * candidates rather than guess which member was meant.
 */
export function findMember<T extends MemberLike>(
  needle: string,
  members: T[],
): T | null {
  const q = normalize(needle);
  if (!q) return null;

  const byId = members.find((member) => member._id === q);
  if (byId) return byId;

  const lower = members.map((member) => member.name.toLowerCase());
  const exact = members.filter((_, index) => lower[index] === q);
  if (exact.length === 1) return exact[0];

  const starts = members.filter((_, index) => lower[index].startsWith(q));
  if (starts.length === 1) return starts[0];

  const loose = members.filter((_, index) => lower[index].includes(q));
  return loose.length === 1 ? loose[0] : null;
}
