import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertCanModerate,
  displayName,
  getCurrentUser,
  isAdmin,
  isModerator,
  requireAdmin,
  requireModerator,
  roleRank,
} from "./lib";
import { ROLES } from "./schema";
import { describeDuration, timeLeft } from "./duration";

const MAX_REASON = 140;
/** Nobody may silence themselves — that is how you lock yourself out. */
const MAX_TIMEOUT_MS = 365 * 24 * 60 * 60 * 1_000;

type Ctx = QueryCtx | MutationCtx;

/** A moderation row, plus whether it still applies right now. */
function describe(row: Doc<"moderation">, now: number) {
  // Only a ban lasts forever; kicks and timeouts both carry an expiry.
  const expired = row.kind !== "ban" && row.until !== undefined && row.until <= now;
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
  if (row.kind !== "ban" && row.until !== undefined && row.until <= now) {
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
  if (row.kind === "kick") {
    throw new Error(
      row.until === undefined
        ? "You have been removed from the site."
        : `You have been removed from the site for another ${timeLeft(row.until)}.`,
    );
  }
  throw new Error(
    row.until === undefined
      ? "You are silenced on this site."
      : `You are silenced for another ${timeLeft(row.until)}.`,
  );
}

/**
 * The caller's own moderation state. This is what the restricted-account page
 * and the site banner read, so a silenced member is told why and until when
 * without having to try posting first.
 */
export const myStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const row = await currentFor(ctx, user._id);
    if (!row) return null;
    return {
      kind: row.kind,
      reason: row.reason ?? null,
      createdAt: row.createdAt,
      until: row.until ?? null,
      summary: describe(row, Date.now()).summary,
    };
  },
});

/** Everything currently in force, newest first. Moderators and up. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireModerator(ctx);
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

/** One member's moderation state. Moderators and up. */
export const status = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireModerator(ctx);
    const now = Date.now();
    const row = await currentFor(ctx, userId, now);
    const user = await ctx.db.get(userId);
    return {
      name: user ? displayName(user) : "Unknown member",
      moderation: row ? describe(row, now) : null,
    };
  },
});

/**
 * What the signed-in viewer is allowed to do to this member, so the UI never
 * has to guess. Banning stays owner-only; timing out is open to moderators.
 */
export const abilities = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const viewer = await getCurrentUser(ctx);
    const target = await ctx.db.get(userId);

    const none = {
      canBan: false,
      canKick: false,
      canTimeout: false,
      canClear: false,
      active: null,
      viewerRole: viewer?.role ?? null,
      targetRole: target?.role ?? null,
    };
    if (!viewer || !target) return none;

    // Strictly below: nobody moderates themselves or their own rank.
    const outranks = roleRank(viewer) > roleRank(target);
    const active = await currentFor(ctx, userId);

    return {
      canBan: outranks && isAdmin(viewer),
      canKick: outranks && isModerator(viewer),
      canTimeout: outranks && isModerator(viewer),
      canClear: outranks && isModerator(viewer) && active !== null,
      active: active ? describe(active, Date.now()) : null,
      viewerRole: viewer.role ?? ROLES.MEMBER,
      targetRole: target.role ?? ROLES.MEMBER,
    };
  },
});

/** How long a kick lasts by default. Short, on purpose: it is reversible. */
const DEFAULT_KICK_MS = 60 * 60 * 1_000;

/**
 * Kick a member off the site. Unlike a ban this lapses on its own, which is why
 * moderators are allowed to do it: the worst case is a member waits an hour.
 */
export const kick = mutation({
  args: {
    userId: v.id("users"),
    durationMs: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { userId, durationMs, reason }) => {
    const moderator = await requireModerator(ctx);
    const target = await ctx.db.get(userId);
    if (!target) {
      throw new Error("That member no longer exists.");
    }
    assertCanModerate(moderator, target);

    const raw = durationMs ?? DEFAULT_KICK_MS;
    if (!Number.isFinite(raw) || raw <= 0) {
      throw new Error("Give a real duration, like 30m or 2h.");
    }
    const capped = Math.min(raw, MAX_TIMEOUT_MS);
    const trimmed = reason?.trim().slice(0, MAX_REASON);

    const existing = await currentFor(ctx, userId);
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    const until = Date.now() + capped;
    await ctx.db.insert("moderation", {
      userId,
      kind: "kick",
      until,
      reason: trimmed || undefined,
      by: moderator._id,
      createdAt: Date.now(),
    });
    return { ok: true, until, label: describeDuration(capped) };
  },
});

/** Permanent ban. Owner only. */
export const ban = mutation({
  args: { userId: v.id("users"), reason: v.optional(v.string()) },
  handler: async (ctx, { userId, reason }) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get(userId);
    if (!target) {
      throw new Error("That member no longer exists.");
    }
    assertCanModerate(admin, target);

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
    const moderator = await requireModerator(ctx);
    const target = await ctx.db.get(userId);
    if (!target) {
      throw new Error("That member no longer exists.");
    }
    assertCanModerate(moderator, target);
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
      by: moderator._id,
      createdAt: Date.now(),
    });
    return { ok: true, until: Date.now() + capped, label: describeDuration(capped) };
  },
});

/** Lift a ban, kick or timeout early. Moderators and up. */
export const clear = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const moderator = await requireModerator(ctx);
    const target = await ctx.db.get(userId);
    if (!target) {
      throw new Error("That member no longer exists.");
    }
    assertCanModerate(moderator, target);
    const existing = await currentFor(ctx, userId);
    if (!existing) {
      throw new Error("That member is not moderated.");
    }
    await ctx.db.delete(existing._id);
    return { ok: true };
  },
});
