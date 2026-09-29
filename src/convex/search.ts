import { v } from "convex/values";
import { query } from "./_generated/server";
import { matchesAllWords, normalizeQuery, queryWords } from "../lib/engagement";
import { DEFAULT_GAMES } from "../lib/catalog";

const PER_GROUP = 5;
/** How much of each source we read before matching. */
const SCAN = 120;

export type SearchHit = {
  kind: "game" | "member" | "request" | "thread" | "poll";
  id: string;
  title: string;
  detail: string;
  href: string;
};

/**
 * One search box across the site. Everything is read in parallel and matched
 * with the same word rules, so a two-word query finds a game called "Granny 2"
 * from either word.
 */
export const all = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const text = normalizeQuery(query);
    // One character would match nearly everything and cost a full scan.
    if (!text) return { hits: [] as SearchHit[] };

    const words = queryWords(text);

    const [storedGames, users, requests, threads, polls] = await Promise.all([
      ctx.db.query("games").collect(),
      ctx.db.query("users").collect(),
      ctx.db
        .query("requests")
        .withIndex("by_createdAt")
        .order("desc")
        .take(SCAN),
      ctx.db
        .query("threads")
        .withIndex("by_createdAt")
        .order("desc")
        .take(SCAN),
      ctx.db
        .query("polls")
        .withIndex("by_createdAt")
        .order("desc")
        .take(SCAN),
    ]);

    const hits: SearchHit[] = [];
    const room = (n: number) => Math.min(n, PER_GROUP);

    // Games: the built-in list overlaid with anything the owner added, which
    // is the same merge the catalog page does.
    const bySlug = new Map<string, { title: string; category: string; description: string }>();
    for (const game of DEFAULT_GAMES) {
      bySlug.set(game.slug, {
        title: game.title,
        category: game.category,
        description: game.description,
      });
    }
    for (const game of storedGames) {
      bySlug.set(game.slug, {
        title: game.title,
        category: game.category,
        description: game.description,
      });
    }
    for (const [slug, game] of bySlug) {
      if (room(hits.length) >= PER_GROUP * 5) break;
      const haystack = `${game.title} ${game.category} ${game.description}`;
      if (!matchesAllWords(haystack, words)) continue;
      hits.push({
        kind: "game",
        id: slug,
        title: game.title,
        detail: game.category,
        href: `/games/${slug}`,
      });
    }

    // Members. Anonymous accounts are left out, same as the staff lookup.
    const members = users
      .filter((user) => !user.isAnonymous && user.name?.trim())
      .filter((user) => matchesAllWords(user.name ?? "", words));
    for (const user of members.slice(0, PER_GROUP)) {
      hits.push({
        kind: "member",
        id: user._id,
        title: user.name ?? "Member",
        detail: user.bio?.trim().slice(0, 80) || "Member profile",
        href: `/u/${user._id}`,
      });
    }

    for (const request of requests) {
      if (hits.filter((hit) => hit.kind === "request").length >= PER_GROUP) break;
      const haystack = `${request.title} ${request.body}`;
      if (!matchesAllWords(haystack, words)) continue;
      hits.push({
        kind: "request",
        id: request._id,
        title: request.title,
        detail: request.body.slice(0, 90),
        href: "/requests",
      });
    }

    for (const thread of threads) {
      if (hits.filter((hit) => hit.kind === "thread").length >= PER_GROUP) break;
      if (!matchesAllWords(thread.title, words)) continue;
      hits.push({
        kind: "thread",
        id: thread._id,
        title: thread.title,
        detail: `Thread in #${thread.channel}`,
        href: `/chat/${thread._id}`,
      });
    }

    for (const poll of polls) {
      if (hits.filter((hit) => hit.kind === "poll").length >= PER_GROUP) break;
      if (!matchesAllWords(poll.question, words)) continue;
      hits.push({
        kind: "poll",
        id: poll._id,
        title: poll.question,
        detail: poll.options.join(" · "),
        href: "/polls",
      });
    }

    return { hits: hits.slice(0, PER_GROUP * 5) };
  },
});
