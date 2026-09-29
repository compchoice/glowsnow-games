import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, isAdmin, requireAdmin, requireUser, displayName } from "./lib";
import { scopeValidator } from "./schema";

const MAX_BODY = 800;

/**
 * Messages for one context: the community lounge, or a single game's comments.
 * Replies come back in the same payload (they carry the same scope + gameSlug),
 * so the UI can nest them without extra subscriptions.
 */
export const list = query({
  args: {
    scope: scopeValidator,
    gameSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { scope, gameSlug, limit }) => {
    const take = Math.min(Math.max(limit ?? 150, 1), 300);

    if (scope === "game") {
      if (!gameSlug) return [];
      return await ctx.db
        .query("messages")
        .withIndex("by_game", (q) => q.eq("gameSlug", gameSlug))
        .order("desc")
        .take(take);
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_scope", (q) => q.eq("scope", "community"))
      .order("desc")
      .take(take);
  },
});

/** The signed-in member's own posts and comments, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("messages")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .order("desc")
      .take(50);
  },
});

export const post = mutation({
  args: {
    scope: scopeValidator,
    gameSlug: v.optional(v.string()),
    parentId: v.optional(v.id("messages")),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const body = args.body.trim();
    if (!body) throw new Error("Write something first.");
    if (body.length > MAX_BODY) {
      throw new Error(`Keep it under ${MAX_BODY} characters.`);
    }
    if (args.scope === "game" && !args.gameSlug) {
      throw new Error("A game is required for a game comment.");
    }

    let parentId = args.parentId;
    if (parentId) {
      const parent = await ctx.db.get(parentId);
      if (!parent) throw new Error("That message no longer exists.");
      if (parent.scope !== args.scope) {
        throw new Error("Replies must stay in the same thread.");
      }
      // Without this, a reply can be filed under a different game than the post
      // it answers. The UI only nests replies under a root it also loaded, so
      // the mismatch would hide the reply from both pages.
      if (args.scope === "game" && parent.gameSlug !== args.gameSlug) {
        throw new Error("Replies must stay on the same game.");
      }
      // Keep threads one level deep: reply to the root message
      parentId = parent.parentId ?? parent._id;
    }

    const id = await ctx.db.insert("messages", {
      scope: args.scope,
      gameSlug: args.scope === "game" ? args.gameSlug : undefined,
      parentId,
      authorId: user._id,
      authorName: displayName(user),
      body,
      createdAt: Date.now(),
    });

    return { id };
  },
});

/** Delete your own message, or any message when you are the owner. */
export const remove = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const message = await ctx.db.get(id);
    if (!message) return { deleted: 0 };

    if (message.authorId !== user._id && !isAdmin(user)) {
      throw new Error("You can only delete your own messages.");
    }

    // Cascade to replies so no orphaned comments are left behind. Every reply
    // goes, not just the caller's: the UI only ever nests replies under a root
    // it also loaded, so a reply whose parent is gone becomes invisible while
    // still counting towards the author's stats.
    const replies = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q) => q.eq("parentId", id))
      .collect();

    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(id);
    return { deleted: replies.length + 1 };
  },
});

export const setPinned = mutation({
  args: { id: v.id("messages"), pinned: v.boolean() },
  handler: async (ctx, { id, pinned }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { pinned });
    return { ok: true };
  },
});
