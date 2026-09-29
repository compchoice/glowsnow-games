import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { displayName, requireAdmin } from "./lib";
import { describeDuration, timeLeft } from "./duration";

const MAX_REASON = 140;
/** Nobody may silence themselves — that is how you lock yourself out. */
const MAX_TIMEOUT_MS = 365 * 24 * 60 * 60 * 1_000;

type Ctx = QueryCtx | MutationCtx;

/** A moderation row, plus whether it still applies right now. */
function describe(row: Doc<"moderation">, now: number) {
  const expired = row.kind === "timeout" && row.until !== undefined && row.until <= now;
  return {
    _id: row._id,
    userId: row.userId,
    kind: row.kind,
    reason: row.reason ?? null,
    createdAt: row.createdAt,
    until: row.until ?? null,
    active: !expired,
    /** Human summary for the console, e.g. "10m left" or "permanent". */
    summary:
      row.kind === "ban"
        ? "permanent"
        : row.until === undefined
          ? "permanent"
          : expired
            ? "expired"
            : `${timeLeft(row.until, now)} left`,
  };
}

/** The moderation in force for one member, or null. */
export async function currentFor(
  ctx: Ctx,
  userId: Id<"users">,
  now: number = Date.now(),
) {
  const row = await ctx.db
    .query("moderation")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!row) return null;
  if (row.kind === "timeout" && row.until !== undefined && row.until <= now) {
    return null;
  }
  return row;
}

/**
 * The gate every write path calls. A ban or a live timeout stops someone posting
 * in chat and in the lounge, but they can still read, watch and browse.
 */
export async function assertCanParticipate(ctx: Ctx, user: Doc<"users">) {
  const row = await currentFor(ctx, user._id);
  if (!row) return;

  if (row.kind === "ban") {
    throw new Error(
      row.reason
        ? `Your account is banned from this site: ${row.reason}`
        : "Your account is banned from this site.",
    );
  }
  throw new Error(
    row.until === undefined
      ? "You are silenced on this site."
      : `You are silenced for another ${timeLeft(row.until)}.`,
  );
}

/** Everything currently in force, newest first. Owner only. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const rows = await ctx.db.query("moderation").collect();
    const users = await ctx.db.query("users").collect();
    const names = new Map(users.map((user) => [user._id, displayName(user)]));

    return rows
      .map((row) => ({
        ...describe(row, now),
        name: names.get(row.userId) ?? "Unknown member",
      }))
      .filter((row) => row.active)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** One member's moderation state. Owner only. */
export const status = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const row = await currentFor(ctx, userId, now);
    const user = await ctx.db.get(userId);
    return {
      name: user ? displayName(user) : "Unknown member",
      moderation: row ? describe(row, now) : null,
    };
  },
});

/** Permanent ban. Owner only. */
export const ban = mutation({
  args: { userId: v.id("users"), reason: v.optional(v.string()) },
  handler: async (ctx, { userId, reason }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId) {
      throw new Error("You cannot ban yourself.");
    }
    if (!(await ctx.db.get(userId))) {
      throw new Error("That member no longer exists.");
    }

    const trimmed = reason?.trim().slice(0, MAX_REASON);
    const existing = await currentFor(ctx, userId);

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    await ctx.db.insert("moderation", {
      userId,
      kind: "ban",
      reason: trimmed || undefined,
      by: admin._id,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Temporary silence. Owner only. */
export const timeout = mutation({
  args: {
    userId: v.id("users"),
    durationMs: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { userId, durationMs, reason }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId) {
      throw new Error("You cannot time yourself out.");
    }
    if (!(await ctx.db.get(userId))) {
      throw new Error("That member no longer exists.");
    }
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error("Give a real duration, like 10m or 2h.");
    }
    const capped = Math.min(durationMs, MAX_TIMEOUT_MS);

    const trimmed = reason?.trim().slice(0, MAX_REASON);
    const existing = await currentFor(ctx, userId);
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    await ctx.db.insert("moderation", {
      userId,
      kind: "timeout",
      until: Date.now() + capped,
      reason: trimmed || undefined,
      by: admin._id,
      createdAt: Date.now(),
    });
    return { ok: true, until: Date.now() + capped, label: describeDuration(capped) };
  },
});

/** Lift a ban or a timeout early. Owner only. */
export const clear = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("moderation")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existing) {
      throw new Error("That member is not moderated.");
    }
    await ctx.db.delete(existing._id);
    return { ok: true };
  },
});
