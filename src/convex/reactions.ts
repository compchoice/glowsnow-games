import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireUser } from "./lib";
import { assertCanParticipate } from "./moderation";
import { isReactionEmoji } from "../lib/engagement";
import { reactionTargetValidator } from "./schema";

/** How many messages' reactions are fetched at once. */
const TARGET_LIMIT = 60;

/**
 * Reactions for a batch of messages, keyed by target id so the caller can hand
 * the whole result to a list without a query per row.
 */
export const forTargets = query({
  args: {
    targetType: reactionTargetValidator,
    targetIds: v.array(v.string()),
  },
  handler: async (ctx, { targetType, targetIds }) => {
    if (targetIds.length === 0) return {} as Record<string, EmojiCount[]>;
    if (targetIds.length > TARGET_LIMIT) {
      throw new Error("That is too many messages at once.");
    }

    const wanted = new Set(targetIds);
    const rows = await ctx.db
      .query("reactions")
      .withIndex("by_target", (q) => q.eq("targetType", targetType))
      .collect();

    const me = (await getCurrentUser(ctx))?._id ?? null;
    const byTarget = new Map<string, Map<string, { count: number; mine: boolean }>>();

    for (const row of rows) {
      if (!wanted.has(row.targetId)) continue;
      const perEmoji =
        byTarget.get(row.targetId) ??
        new Map<string, { count: number; mine: boolean }>();
      const entry = perEmoji.get(row.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (row.userId === me) entry.mine = true;
      perEmoji.set(row.emoji, entry);
      byTarget.set(row.targetId, perEmoji);
    }

    const out: Record<string, EmojiCount[]> = {};
    for (const [targetId, perEmoji] of byTarget) {
      out[targetId] = [...perEmoji.entries()]
        .map(([emoji, entry]) => ({ emoji, count: entry.count, mine: entry.mine }))
        // Most reacted first, then alphabetical so the row never jitters.
        .sort((a, b) =>
          b.count - a.count || a.emoji.localeCompare(b.emoji),
        );
    }
    return out;
  },
});

export type EmojiCount = { emoji: string; count: number; mine: boolean };

/**
 * Adds a reaction, or takes it back if this member already left that one. One
 * row per person per message per emoji, so the count is a row count and two
 * taps cannot double-count.
 */
export const toggle = mutation({
  args: {
    targetType: reactionTargetValidator,
    targetId: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, { targetType, targetId, emoji }) => {
    const user = await requireUser(ctx);
    await assertCanParticipate(ctx, user);

    if (!isReactionEmoji(emoji)) throw new Error("Pick one of the offered emoji.");

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_target", (q) => q.eq("targetType", targetType))
      .collect();

    const mine = existing.find(
      (row) =>
        row.targetId === targetId && row.userId === user._id && row.emoji === emoji,
    );

    if (mine) {
      await ctx.db.delete(mine._id);
      return { on: false };
    }

    await ctx.db.insert("reactions", {
      targetType,
      targetId,
      userId: user._id,
      emoji,
      createdAt: Date.now(),
    });
    return { on: true };
  },
});
