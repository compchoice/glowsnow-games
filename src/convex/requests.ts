import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  displayName,
  isAdmin,
  isModerator,
  requireAdmin,
  requireModerator,
  requireUser,
} from "./lib";
import { ROLES, requestStatusValidator } from "./schema";

/**
 * The suggestion board.
 *
 * Any member can put an idea up. Replying is deliberately limited to moderators
 * and the owner, so the thread reads as "someone asked, the team answered" —
 * which is the whole point of the feature.
 */

const MAX_TITLE = 120;
const MAX_BODY = 1_000;
const MAX_COMMENT = 600;
const LIST_LIMIT = 100;

function trim(value: string, max: number) {
  return value.trim().slice(0, max);
}

/** Every request with its replies attached, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_createdAt")
      .order("desc")
      .take(LIST_LIMIT);

    const comments = await Promise.all(
      rows.map((row) =>
        ctx.db
          .query("requestComments")
          .withIndex("by_request", (q) => q.eq("requestId", row._id))
          .collect(),
      ),
    );

    return rows.map((row, index) => ({
      _id: row._id,
      authorId: row.authorId,
      author: row.authorName,
      title: row.title,
      body: row.body,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? null,
      comments: comments[index].map((comment) => ({
        _id: comment._id,
        authorId: comment.authorId,
        author: comment.authorName,
        authorRole: comment.authorRole,
        body: comment.body,
        createdAt: comment.createdAt,
      })),
    }));
  },
});

/** Ask for something. Open to any signed-in member. */
export const create = mutation({
  args: { title: v.string(), body: v.string() },
  handler: async (ctx, { title, body }) => {
    const user = await requireUser(ctx);
    const cleanTitle = trim(title, MAX_TITLE);
    if (!cleanTitle) throw new Error("Give the request a title.");
    const cleanBody = trim(body, MAX_BODY);
    if (!cleanBody) throw new Error("Say what you would like to see.");

    const id = await ctx.db.insert("requests", {
      authorId: user._id,
      authorName: displayName(user),
      title: cleanTitle,
      body: cleanBody,
      status: "open",
      createdAt: Date.now(),
    });
    return { id };
  },
});

/** Reply to a request. Moderators and the owner only. */
export const comment = mutation({
  args: { requestId: v.id("requests"), body: v.string() },
  handler: async (ctx, { requestId, body }) => {
    const user = await requireModerator(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("That request no longer exists.");
    const clean = trim(body, MAX_COMMENT);
    if (!clean) throw new Error("Write a reply first.");

    const id = await ctx.db.insert("requestComments", {
      requestId,
      authorId: user._id,
      authorName: displayName(user),
      authorRole: user.role ?? ROLES.MODERATOR,
      body: clean,
      createdAt: Date.now(),
    });
    await ctx.db.patch(requestId, { updatedAt: Date.now() });
    return { id };
  },
});

/** Move a request along. Owner only — this is the "we're doing it" control. */
export const setStatus = mutation({
  args: { requestId: v.id("requests"), status: requestStatusValidator },
  handler: async (ctx, { requestId, status }) => {
    await requireAdmin(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("That request no longer exists.");
    await ctx.db.patch(requestId, { status, updatedAt: Date.now() });
    return { ok: true };
  },
});

/** Withdraw a request. The member who wrote it, or the owner. */
export const remove = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    const user = await requireUser(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) return { ok: true };
    if (request.authorId !== user._id && !isAdmin(user)) {
      throw new Error("You can only withdraw your own request.");
    }

    const comments = await ctx.db
      .query("requestComments")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .collect();
    for (const entry of comments) {
      await ctx.db.delete(entry._id);
    }
    await ctx.db.delete(requestId);
    return { ok: true };
  },
});

/** Delete a reply. Its author, any moderator, or the owner. */
export const removeComment = mutation({
  args: { commentId: v.id("requestComments") },
  handler: async (ctx, { commentId }) => {
    const user = await requireUser(ctx);
    const comment = await ctx.db.get(commentId);
    if (!comment) return { ok: true };
    if (comment.authorId !== user._id && !isModerator(user)) {
      throw new Error("You can only delete your own replies.");
    }
    await ctx.db.delete(commentId);
    return { ok: true };
  },
});
