/**
 * The shared vocabulary for reactions, badges, polls and search. Everything
 * here is pure so the Convex side and the browser agree on the same answers
 * without shipping copy to the client twice.
 */

/** The only emoji a reaction may use. Keeping it closed stops abuse. */
export const REACTION_EMOJI = [
  "👍",
  "😂",
  "😮",
  "😢",
  "🔥",
  "🎉",
  "❤️",
] as const;

export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

/** Whether a string is one of the allowed reaction emoji. */
export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJI as readonly string[]).includes(value);
}

/**
 * A stable key for a pair of members, so both people look up the same
 * conversation. Sorting means "a to b" and "b to a" produce one key.
 */
export function dmKey(a: string, b: string): string {
  return [a, b].sort().join("~");
}

/** Splits a pair key back into its two ids, smallest first. */
export function parseDmKey(key: string): [string, string] | null {
  const parts = key.split("~");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

export type AchievementKey =
  | "first-post"
  | "chatter"
  | "reviewer"
  | "collector"
  | "friend"
  | "pollster"
  | "granny"
  | "arcade";

export type AchievementDef = {
  key: AchievementKey;
  title: string;
  description: string;
  emoji: string;
  points: number;
};

/** Badges, cheapest to earn first. The client reads titles straight from here. */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first-post",
    title: "Hello, world",
    description: "Posted your first message in chat.",
    emoji: "👋",
    points: 5,
  },
  {
    key: "arcade",
    title: "Arcade regular",
    description: "Played three different games.",
    emoji: "🕹️",
    points: 10,
  },
  {
    key: "reviewer",
    title: "Critic",
    description: "Reviewed a game.",
    emoji: "⭐",
    points: 10,
  },
  {
    key: "friend",
    title: "Not a loner",
    description: "Made a friend.",
    emoji: "🤝",
    points: 10,
  },
  {
    key: "pollster",
    title: "Has a say",
    description: "Voted in a community poll.",
    emoji: "🗳️",
    points: 10,
  },
  {
    key: "granny",
    title: "Grandparent's house",
    description: "Survived a Granny game.",
    emoji: "🕯️",
    points: 15,
  },
  {
    key: "chatter",
    title: "Talks a lot",
    description: "Posted fifty messages in chat.",
    emoji: "💬",
    points: 25,
  },
  {
    key: "collector",
    title: "Collector",
    description: "Saved ten games to your shelf.",
    emoji: "🗄️",
    points: 25,
  },
];

const BY_KEY = new Map(ACHIEVEMENTS.map((badge) => [badge.key, badge]));

export function achievementByKey(key: string): AchievementDef | undefined {
  return BY_KEY.get(key as AchievementKey);
}

/** Points a set of earned badge keys is worth. Unknown keys count for nothing. */
export function pointsFor(keys: string[]): number {
  return keys.reduce((total, key) => total + (BY_KEY.get(key as AchievementKey)?.points ?? 0), 0);
}

export type Rank = { name: string; floor: number; emoji: string };

export const RANKS: Rank[] = [
  { name: "Newcomer", floor: 0, emoji: "🌱" },
  { name: "Regular", floor: 25, emoji: "🎮" },
  { name: "Veteran", floor: 60, emoji: "🕹️" },
  { name: "Notable", floor: 110, emoji: "⭐" },
  { name: "Legend", floor: 180, emoji: "👑" },
];

/** The highest rank a member has reached. Points below the first floor still count. */
export function rankForPoints(points: number): Rank {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (points >= rank.floor) current = rank;
  }
  return current;
}

/** How far to the next rank, or null at the top. */
export function nextRank(points: number): Rank | null {
  return RANKS.find((rank) => rank.floor > points) ?? null;
}

/**
 * A poll result. The share is a percentage of the total so a bar can be drawn
 * without the caller dividing, and the winning index is the first to reach the
 * top so a tie reads as a tie rather than as "the last one".
 */
export type PollTally = {
  counts: number[];
  total: number;
  /** Percentage per option, rounded. Sums to 100 unless the total is zero. */
  shares: number[];
  leaderIndex: number | null;
};

export function tallyPoll(options: string[], votes: number[]): PollTally {
  const counts = options.map((_, index) =>
    votes.filter((vote) => vote === index).length,
  );
  const total = counts.reduce((sum, count) => sum + count, 0);

  let leaderIndex: number | null = null;
  for (let index = 0; index < counts.length; index += 1) {
    if (total === 0) break;
    if (leaderIndex === null || counts[index] > counts[leaderIndex]) {
      leaderIndex = index;
    }
  }

  const shares = counts.map((count) =>
    total === 0 ? 0 : Math.round((count / total) * 100),
  );

  return { counts, total, shares, leaderIndex: total === 0 ? null : leaderIndex };
}

/** Longest poll option the schema will store. */
export const MAX_POLL_OPTIONS = 6;
export const MAX_POLL_OPTION_LENGTH = 40;
export const MAX_POLL_QUESTION = 120;

export type PollValidation = { ok: true; options: string[] } | { ok: false; error: string };

/** Checks a poll before it is stored, so the client can show the same message. */
export function validatePoll(
  question: string,
  rawOptions: string[],
): PollValidation {
  const text = question.trim();
  if (!text) return { ok: false, error: "Give the poll a question." };
  if (text.length > MAX_POLL_QUESTION) {
    return { ok: false, error: "That question is too long." };
  }

  const options = rawOptions.map((option) => option.trim()).filter(Boolean);
  if (options.length < 2) return { ok: false, error: "Offer at least two choices." };
  if (options.length > MAX_POLL_OPTIONS) {
    return { ok: false, error: `Keep it to ${MAX_POLL_OPTIONS} choices.` };
  }
  for (const option of options) {
    if (option.length > MAX_POLL_OPTION_LENGTH) {
      return { ok: false, error: "One of those choices is too long." };
    }
  }

  const seen = new Set(options.map((option) => option.toLowerCase()));
  if (seen.size !== options.length) {
    return { ok: false, error: "Two of those choices are the same." };
  }

  return { ok: true, options };
}

/** The most a search term may be, so a huge string cannot be sent to the server. */
export const MAX_SEARCH_LENGTH = 60;

/**
 * Whether a search term is worth sending. One character would scan the whole
 * site and match everything.
 */
export function normalizeQuery(input: string): string | null {
  const text = input.trim().slice(0, MAX_SEARCH_LENGTH);
  if (text.length < 2) return null;
  return text;
}

/** Every word in a search term, lowercased, for whole-word-ish matching. */
export function queryWords(input: string): string[] {
  const text = input.trim().toLowerCase();
  if (!text) return [];
  return text.split(/\s+/).filter(Boolean);
}

/** True when every word appears somewhere in the haystack. */
export function matchesAllWords(haystack: string, words: string[]): boolean {
  if (words.length === 0) return false;
  const text = haystack.toLowerCase();
  return words.every((word) => text.includes(word));
}
