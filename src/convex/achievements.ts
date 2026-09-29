import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser, requireUser } from "./lib";
import {
  ACHIEVEMENTS,
  pointsFor,
  type AchievementKey,
} from "../lib/engagement";

const LEADERBOARD_SIZE = 25;

/**
 * Awards a badge if it is not already held, then refreshes the cached points on
 * the leaderboard row. Safe to call on every event: awarding twice is a no-op,
 * so a member cannot farm points by playing the same game again.
 */
export async function award(
  ctx: MutationCtx,
  user: Doc<"users">,
  key: AchievementKey,
): Promise<boolean> {
  const existing = await ctx.db
    .query("achievements")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();

  if (existing.some((row) => row.key === key)) return false;

  await ctx.db.insert("achievements", {
    userId: user._id,
    key,
    earnedAt: Date.now(),
  });

  await refreshPoints(ctx, user._id);
  return true;
}

/** Recomputes a member's total from the badges they actually hold. */
async function refreshPoints(ctx: MutationCtx, userId: Doc<"users">["_id"]) {
  const rows = await ctx.db
    .query("achievements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const points = pointsFor(rows.map((row) => row.key));

  const existing = await ctx.db
    .query("standings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { points, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("standings", {
      userId,
      points,
      updatedAt: Date.now(),
    });
  }
  return points;
}

/** Re-derives a member's points on demand. Owner use, for a stale cache. */
export const recompute = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireUser(ctx);
    if (!userId) throw new Error("Who?");
    return { points: await refreshPoints(ctx, userId) };
  },
});

/** The badges one member holds, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { earned: [] as string[], points: 0 };

    const rows = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return { earned: rows.map((row) => row.key), points: pointsFor(rows.map((r) => r.key)) };
  },
});

/** One member's public badge shelf, for their profile. */
export const forUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return {
      earned: rows.map((row) => row.key),
      points: pointsFor(rows.map((row) => row.key)),
    };
  },
});

/** The leaderboard. Members with no badges are not worth a row. */
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("standings")
      .withIndex("by_points")
      .order("desc")
      .take(LEADERBOARD_SIZE);

    const ranked = await Promise.all(
      rows.map(async (row, index) => {
        const user = await ctx.db.get(row.userId);
        return {
          rank: index + 1,
          userId: row.userId,
          name: user?.name ?? user?.email?.split("@")[0] ?? "Member",
          avatar: user?.avatar ?? null,
          points: row.points,
          badges: (
            await ctx.db
              .query("achievements")
              .withIndex("by_user", (q) => q.eq("userId", row.userId))
              .collect()
          ).length,
        };
      }),
    );

    return ranked;
  },
});

/** Every badge and whether the caller holds it, so the page can grey out the rest. */
export const catalogue = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const rows = user
      ? await ctx.db
          .query("achievements")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect()
      : [];
    const held = new Set(rows.map((row) => row.key));
    return ACHIEVEMENTS.map((badge) => ({ ...badge, earned: held.has(badge.key) }));
  },
});
