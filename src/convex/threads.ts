import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { displayName, requireUser } from "./lib";
import { assertCanParticipate } from "./moderation";
import { checkChannel } from "./channels";

const MAX_TITLE = 80;
const MAX_BODY = 500;
const THREAD_SCAN = 30;
const REPLY_LIMIT = 100;

/** Threads in a channel, most recently active first. */
export const list = query({
  args: { channel: v.string() },
  handler: async (ctx, { channel }) => {
    checkChannel(channel);
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_channel", (q) => q.eq("channel", channel))
      .order("desc")
      .take(THREAD_SCAN);

    return Promise.all(
      threads.map(async (thread) => {
        const replies = await ctx.db
          .query("threadReplies")
          .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
          .collect();
        return {
          _id: thread._id,
          title: thread.title,
          authorName: thread.authorName,
          createdAt: thread.createdAt,
          lastReplyAt: thread.lastReplyAt,
          replyCount: replies.length,
        };
      }),
    );
  },
});

/** One thread with its replies, oldest first. */
export const thread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const parent = await ctx.db.get(threadId);
    if (!parent) return null;

    const replies = await ctx.db
      .query("threadReplies")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .take(REPLY_LIMIT);

    return {
      _id: parent._id,
      title: parent.title,
      channel: parent.channel,
      authorName: parent.authorName,
      createdAt: parent.createdAt,
      replies: replies.map((reply) => ({
        _id: reply._id,
        body: reply.body,
        authorName: reply.authorName,
        createdAt: reply.createdAt,
      })),
    };
  },
});

/** Starts a thread. The title is the whole post, so there is no body. */
export const create = mutation({
  args: { channel: v.string(), title: v.string() },
  handler: async (ctx, { channel, title }) => {
    const user = await requireUser(ctx);
    await assertCanParticipate(ctx, user);
    const room = checkChannel(channel);

    const text = title.trim().slice(0, MAX_TITLE);
    if (!text) throw new Error("Give the thread a title.");

    const now = Date.now();
    return await ctx.db.insert("threads", {
      channel: room,
      title: text,
      authorId: user._id,
      authorName: displayName(user),
      createdAt: now,
      lastReplyAt: now,
    });
  },
});

/** Replies to a thread and bumps it to the top of its channel. */
export const reply = mutation({
  args: { threadId: v.id("threads"), body: v.string() },
  handler: async (ctx, { threadId, body }) => {
    const user = await requireUser(ctx);
    await assertCanParticipate(ctx, user);

    const parent = await ctx.db.get(threadId);
    if (!parent) throw new Error("That thread is gone.");

    const text = body.trim().slice(0, MAX_BODY);
    if (!text) throw new Error("Write something first.");

    const now = Date.now();
    const id = await ctx.db.insert("threadReplies", {
      threadId,
      authorId: user._id,
      authorName: displayName(user),
      body: text,
      createdAt: now,
    });
    await ctx.db.patch(parent._id, { lastReplyAt: now });
    return id;
  },
});
