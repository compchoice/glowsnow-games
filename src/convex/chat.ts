import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { displayName, requireUser } from "./lib";
import { assertCanParticipate, currentFor } from "./moderation";

const MAX_BODY = 500;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 400;
/** Rooms in the server. Kept here so the client can never invent a channel. */
export const CHANNELS = [
  { id: "lounge", label: "lounge", topic: "Anything goes" },
  { id: "games", label: "what-are-we-playing", topic: "Scores, tips, sessions" },
  { id: "help", label: "help", topic: "Stuck on something?" },
] as const;

const CHANNEL_IDS = new Set<string>(CHANNELS.map((channel) => channel.id));
const DEFAULT_CHANNEL = "lounge";

function checkChannel(channel: string): string {
  if (!CHANNEL_IDS.has(channel)) {
    throw new Error("That channel does not exist.");
  }
  return channel;
}
/** How long a heartbeat keeps someone "online". */
const ONLINE_WINDOW_MS = 25_000;
/** How long one keystroke keeps someone "typing". */
const TYPING_WINDOW_MS = 4_500;

/** The channel list, for the server sidebar. */
export const channels = query({
  args: {},
  handler: async () => CHANNELS,
});

/**
 * The most recent messages, oldest first so the UI can just append and scroll.
 * Convex pushes updates to every open client over the websocket, so nobody has
 * to poll for new messages.
 */
export const list = query({
  args: { limit: v.optional(v.number()), channel: v.optional(v.string()) },
  handler: async (ctx, { limit, channel }) => {
    const take = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const room = checkChannel(channel ?? DEFAULT_CHANNEL);
    const newestFirst = await ctx.db
      .query("chatMessages")
      .withIndex("by_channel", (q) => q.eq("channel", room))
      .order("desc")
      .take(take);

    // Messages posted before rooms existed have no channel set. Fold them into
    // the main room so the old history is not stranded.
    if (room !== DEFAULT_CHANNEL) return newestFirst.reverse();

    const legacy = await ctx.db
      .query("chatMessages")
      .withIndex("by_channel", (q) => q.eq("channel", undefined))
      .order("desc")
      .take(take);

    return [...newestFirst, ...legacy]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, take)
      .reverse();
  },
});

/** Who is in the room, and who is currently typing. */
export const presence = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rows = await ctx.db.query("chatPresence").collect();
    const online = rows.filter(
      (row) => now - row.lastSeenAt < ONLINE_WINDOW_MS,
    );

    // A banned or silenced member can still read the room, but they should not
    // appear in the roster or in the typing indicator.
    const muted = new Set<string>();
    for (const row of await ctx.db.query("moderation").collect()) {
      const live = await currentFor(ctx, row.userId, now);
      if (live) muted.add(row.userId);
    }
    const visible = online.filter((row) => !muted.has(row.userId));

    return {
      onlineCount: visible.length,
      online: visible
        .map((row) => ({
          userId: row.userId as string,
          name: row.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      typing: visible
        .filter((row) => row.typingAt && now - row.typingAt < TYPING_WINDOW_MS)
        .map((row) => ({ userId: row.userId as string, name: row.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
});

/** Upserts the caller's presence row. */
async function touchPresence(
  ctx: MutationCtx,
  user: Doc<"users">,
  options: { typing?: boolean },
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("chatPresence")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .first();

  const patch: {
    name: string;
    lastSeenAt: number;
    typingAt?: number;
  } = {
    name: displayName(user),
    lastSeenAt: now,
  };

  // Only touch the typing flag when the caller says something about it, so the
  // periodic heartbeat doesn't clear a sentence in progress.
  if (options.typing !== undefined) {
    patch.typingAt = options.typing ? now : undefined;
  }

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return;
  }

  await ctx.db.insert("chatPresence", { userId: user._id, ...patch });
}

export const send = mutation({
  args: { body: v.string(), channel: v.optional(v.string()) },
  handler: async (ctx, { body, channel }) => {
    const user = await requireUser(ctx);
    await assertCanParticipate(ctx, user);
    const text = body.trim();
    if (!text) throw new Error("Write something first.");
    if (text.length > MAX_BODY) {
      throw new Error(`Keep it under ${MAX_BODY} characters.`);
    }
    const room = checkChannel(channel ?? DEFAULT_CHANNEL);

    const id: Id<"chatMessages"> = await ctx.db.insert("chatMessages", {
      authorId: user._id,
      authorName: displayName(user),
      body: text,
      createdAt: Date.now(),
      channel: room,
    });

    // Sending counts as being here, and ends the typing flag.
    await touchPresence(ctx, user, { typing: false });
    return { id };
  },
});

/** Keeps the caller marked as online; `typing` also refreshes the typing flag. */
export const heartbeat = mutation({
  args: { typing: v.optional(v.boolean()) },
  handler: async (ctx, { typing }) => {
    const user = await requireUser(ctx);
    // A silenced member keeps their heartbeat (so they are not shown as
    // dropped) but can no longer claim to be typing.
    if (typing) {
      const live = await currentFor(ctx, user._id);
      if (live) {
        await touchPresence(ctx, user, { typing: false });
        return { ok: false };
      }
    }
    await touchPresence(ctx, user, typing === undefined ? {} : { typing });
    return { ok: true };
  },
});

/** Called when the room unmounts so someone leaves the list immediately. */
export const leave = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: true };
    const row = await ctx.db
      .query("chatPresence")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (row) await ctx.db.delete(row._id);
    return { ok: true };
  },
});
