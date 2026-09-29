import { describe, expect, test } from "bun:test";
import {
  ACHIEVEMENTS,
  MAX_POLL_OPTIONS,
  achievementByKey,
  dmKey,
  isReactionEmoji,
  matchesAllWords,
  nextRank,
  normalizeQuery,
  parseDmKey,
  pointsFor,
  queryWords,
  rankForPoints,
  tallyPoll,
  validatePoll,
} from "../src/lib/engagement";

describe("reaction emoji", () => {
  test("accepts the allowlist", () => {
    expect(isReactionEmoji("🔥")).toBe(true);
    expect(isReactionEmoji("👍")).toBe(true);
  });

  test("rejects anything outside it", () => {
    expect(isReactionEmoji("💩")).toBe(false);
    expect(isReactionEmoji("<script>")).toBe(false);
    expect(isReactionEmoji("")).toBe(false);
  });
});

describe("dmKey", () => {
  test("is the same whichever way round the pair is given", () => {
    expect(dmKey("alice", "bob")).toBe(dmKey("bob", "alice"));
  });

  test("different pairs get different keys", () => {
    expect(dmKey("alice", "bob")).not.toBe(dmKey("alice", "carol"));
  });

  test("round-trips", () => {
    const [a, b] = parseDmKey(dmKey("alice", "bob")) ?? [];
    expect([a, b]?.sort()).toEqual(["alice", "bob"]);
  });

  test("rejects a malformed key", () => {
    expect(parseDmKey("alice")).toBeNull();
    expect(parseDmKey("")).toBeNull();
    expect(parseDmKey("a~b~c")).toBeNull();
  });
});

describe("achievements", () => {
  test("every badge has a unique key", () => {
    const keys = ACHIEVEMENTS.map((badge) => badge.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every badge is worth something", () => {
    for (const badge of ACHIEVEMENTS) {
      expect(badge.points).toBeGreaterThan(0);
    }
  });

  test("unknown keys are worth nothing rather than throwing", () => {
    expect(pointsFor(["first-post", "not-a-real-badge"])).toBe(
      achievementByKey("first-post")?.points,
    );
    expect(achievementByKey("not-a-real-badge")).toBeUndefined();
  });

  test("points add up", () => {
    expect(pointsFor(["first-post", "chatter"])).toBe(5 + 25);
    expect(pointsFor([])).toBe(0);
  });
});

describe("rankForPoints", () => {
  test("a brand new member is a newcomer", () => {
    expect(rankForPoints(0).name).toBe("Newcomer");
  });

  test("rewards are never lost when points go up", () => {
    let previous = rankForPoints(0);
    for (let points = 0; points < 400; points += 5) {
      const rank = rankForPoints(points);
      expect(rank.floor).toBeGreaterThanOrEqual(previous.floor);
      previous = rank;
    }
  });

  test("points past the top stay at the top rank", () => {
    expect(rankForPoints(9999).name).toBe("Legend");
    expect(nextRank(9999)).toBeNull();
  });

  test("nextRank names the rank ahead", () => {
    expect(nextRank(0)?.floor).toBe(25);
  });
});

describe("tallyPoll", () => {
  test("counts and shares", () => {
    const result = tallyPoll(["a", "b", "c"], [0, 0, 1]);
    expect(result.counts).toEqual([2, 1, 0]);
    expect(result.total).toBe(3);
    expect(result.shares).toEqual([67, 33, 0]);
    expect(result.leaderIndex).toBe(0);
  });

  test("an empty poll has no leader and does not divide by zero", () => {
    const result = tallyPoll(["a", "b"], []);
    expect(result.total).toBe(0);
    expect(result.shares).toEqual([0, 0]);
    expect(result.leaderIndex).toBeNull();
  });

  test("a tie reports the first option, not the last", () => {
    expect(tallyPoll(["a", "b"], [0, 1]).leaderIndex).toBe(0);
  });

  test("out-of-range votes do not corrupt the tally", () => {
    const result = tallyPoll(["a", "b"], [0, 9, -1]);
    expect(result.total).toBe(1);
    expect(result.counts).toEqual([1, 0]);
  });
});

describe("validatePoll", () => {
  test("accepts a good poll and trims the options", () => {
    const result = validatePoll("  Best game?  ", [" Granny ", "Tetris", " "]);
    expect(result).toEqual({ ok: true, options: ["Granny", "Tetris"] });
  });

  test("needs a question", () => {
    expect(validatePoll("   ", ["a", "b"])).toEqual({
      ok: false,
      error: "Give the poll a question.",
    });
  });

  test("needs two choices", () => {
    const result = validatePoll("Q", ["only"]);
    expect(result.ok).toBe(false);
  });

  test("refuses duplicate choices however they are cased", () => {
    const result = validatePoll("Q", ["Granny", "granny"]);
    expect(result).toEqual({ ok: false, error: "Two of those choices are the same." });
  });

  test("refuses too many choices", () => {
    const many = Array.from({ length: MAX_POLL_OPTIONS + 1 }, (_, i) => `opt ${i}`);
    expect(validatePoll("Q", many).ok).toBe(false);
  });
});

describe("search helpers", () => {
  test("a one character query is not worth sending", () => {
    expect(normalizeQuery("a")).toBeNull();
    expect(normalizeQuery("  ")).toBeNull();
  });

  test("trims and caps the query", () => {
    expect(normalizeQuery("  granny  ")).toBe("granny");
    expect(normalizeQuery("x".repeat(500))?.length).toBe(60);
  });

  test("splits into lowercased words", () => {
    expect(queryWords("  Granny  TWO ")).toEqual(["granny", "two"]);
  });

  test("every word has to appear somewhere", () => {
    expect(matchesAllWords("Granny Two horror", ["granny", "horror"])).toBe(true);
    expect(matchesAllWords("Granny Two horror", ["granny", "platformer"])).toBe(false);
  });

  test("an empty query never matches", () => {
    expect(matchesAllWords("anything", [])).toBe(false);
  });
});
