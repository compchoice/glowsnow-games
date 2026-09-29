import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { displayName, getCurrentUser, requireUser } from "./lib";

/**
 * Member reviews for a game. One review per member per game: re-submitting
 * replaces the old one rather than stacking up, and the by_user_game index
 * keeps that cheap.
 */

const MAX_BODY = 600;
const REVIEW_LIMIT = 50;

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.min(5, Math.max(1, Math.round(value)));
}

/** Every review for one game, newest first, with the running average. */
export const forGame = query({
  args: { gameSlug: v.string() },
  handler: async (ctx, { gameSlug }) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_game", (q) => q.eq("gameSlug", gameSlug))
      .order("desc")
      .take(REVIEW_LIMIT);

    const total = rows.reduce((sum, row) => sum + row.rating, 0);

    return {
      average: rows.length === 0 ? null : total / rows.length,
      count: rows.length,
      reviews: rows.map((row) => ({
        _id: row._id,
        userId: row.userId,
        author: row.authorName,
        rating: row.rating,
        body: row.body ?? "",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt ?? null,
      })),
    };
  },
});

/** The caller's own review for a game, so the form can prefill. */
export const mine = query({
  args: { gameSlug: v.string() },
  handler: async (ctx, { gameSlug }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const row = await ctx.db
      .query("reviews")
      .withIndex("by_user_game", (q) =>
        q.eq("userId", user._id).eq("gameSlug", gameSlug),
      )
      .first();
    if (!row) return null;
    return { _id: row._id, rating: row.rating, body: row.body ?? "" };
  },
});

/** Leave or update a review. */
export const submit = mutation({
  args: {
    gameSlug: v.string(),
    rating: v.number(),
    body: v.optional(v.string()),
  },
  handler: async (ctx, { gameSlug, rating, body }) => {
    const user = await requireUser(ctx);
    const slug = gameSlug.trim().slice(0, 80);
    if (!slug) throw new Error("A game is required.");
    const stars = clampRating(rating);
    const text = (body ?? "").trim().slice(0, MAX_BODY);

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_game", (q) =>
        q.eq("userId", user._id).eq("gameSlug", slug),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rating: stars,
        body: text || undefined,
        updatedAt: Date.now(),
      });
      return { id: existing._id, updated: true };
    }

    const id = await ctx.db.insert("reviews", {
      gameSlug: slug,
      userId: user._id,
      authorName: displayName(user),
      rating: stars,
      body: text || undefined,
      createdAt: Date.now(),
    });
    return { id, updated: false };
  },
});

/** Withdraw your own review. */
export const remove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const row = await ctx.db.get(id);
    if (!row) return { ok: true };
    if (row.userId !== user._id) {
      throw new Error("You can only delete your own review.");
    }
    await ctx.db.delete(id);
    return { ok: true };
  },
});
