import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireUser } from "./lib";
import { award } from "./achievements";

function cleanSlug(slug: string): string {
  const trimmed = slug.trim().slice(0, 80);
  if (!trimmed) throw new Error("A game is required.");
  return trimmed;
}

/** The signed-in member's saved games, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return rows.map((row) => ({
      _id: row._id,
      gameSlug: row.gameSlug,
      createdAt: row.createdAt,
      lastPlayedAt: row.lastPlayedAt ?? null,
    }));
  },
});

/** Save or unsave a game. Returns the state after the toggle. */
export const toggle = mutation({
  args: { gameSlug: v.string() },
  handler: async (ctx, { gameSlug }) => {
    const user = await requireUser(ctx);
    const slug = cleanSlug(gameSlug);

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_game", (q) =>
        q.eq("userId", user._id).eq("gameSlug", slug),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { favorited: false };
    }

    await ctx.db.insert("favorites", {
      userId: user._id,
      gameSlug: slug,
      createdAt: Date.now(),
    });

    // Badges for playing and for collecting, counted from the shelf itself so
    // they cannot be farmed by saving the same game twice.
    const shelf = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    if (shelf.length >= 10) await award(ctx, user, "collector");
    if (shelf.length >= 3) await award(ctx, user, "arcade");

    return { favorited: true };
  },
});

/** Records that a saved game was just played, so the shelf can sort by recency. */
export const touch = mutation({
  args: { gameSlug: v.string() },
  handler: async (ctx, { gameSlug }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false };
    const slug = cleanSlug(gameSlug);

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_game", (q) =>
        q.eq("userId", user._id).eq("gameSlug", slug),
      )
      .first();

    if (!existing) return { ok: false };
    await ctx.db.patch(existing._id, { lastPlayedAt: Date.now() });
    return { ok: true };
  },
});
