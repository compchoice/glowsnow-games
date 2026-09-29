import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { displayName, getCurrentUser, isAdmin, requireUser } from "./lib";
import { ROLES } from "./schema";

const MAX_NAME = 40;
const MAX_BIO = 200;
const MAX_AVATAR = 8;

/**
 * A public profile: who someone is, what they have done, and their recent
 * activity. Email addresses stay private unless you are looking at your own
 * profile or you are the owner.
 */
export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Take a raw string and normalise it, so a hand-typed or stale profile URL
    // can never blow up argument validation — an unknown id just reads as a
    // member who does not exist.
    const id = ctx.db.normalizeId("users", userId);
    if (!id) return null;

    const user = await ctx.db.get(id);
    if (!user) return null;

    const viewer = await getCurrentUser(ctx);
    const isSelf = viewer?._id === id;
    const viewerIsAdmin = isAdmin(viewer);

    const [authored, chat, favorites, playlists] = await Promise.all([
      ctx.db
        .query("messages")
        .withIndex("by_author", (q) => q.eq("authorId", id))
        .order("desc")
        .collect(),
      ctx.db
        .query("chatMessages")
        .withIndex("by_author", (q) => q.eq("authorId", id))
        .order("desc")
        .collect(),
      ctx.db
        .query("favorites")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .collect(),
      ctx.db
        .query("playlists")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .collect(),
    ]);

    return {
      _id: user._id,
      name: displayName(user),
      avatar: user.avatar ?? null,
      bio: user.bio ?? null,
      role: user.role ?? ROLES.MEMBER,
      isAnonymous: user.isAnonymous ?? false,
      joinedAt: user._creationTime,
      email: isSelf || viewerIsAdmin ? (user.email ?? null) : null,
      isSelf,
      stats: {
        posts: authored.filter((message) => !message.parentId).length,
        replies: authored.filter((message) => message.parentId).length,
        chat: chat.length,
        favorites: favorites.length,
        playlists: playlists.length,
      },
      recentMessages: authored.slice(0, 8).map((message) => ({
        _id: message._id,
        body: message.body,
        createdAt: message.createdAt,
        scope: message.scope,
        gameSlug: message.gameSlug ?? null,
        isReply: Boolean(message.parentId),
      })),
      recentChat: chat.slice(0, 6).map((message) => ({
        _id: message._id,
        body: message.body,
        createdAt: message.createdAt,
      })),
    };
  },
});

/**
 * Lightweight lookup table of every member's name and avatar, so messages and
 * the chat room can render avatars without denormalising them into each row.
 */
export const directory = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      _id: user._id,
      name: displayName(user),
      avatar: user.avatar ?? null,
      role: user.role ?? ROLES.MEMBER,
    }));
  },
});

/**
 * How many accounts exist, for the member count in the footer. The users table
 * stays small on a site this size, so a plain count is cheaper than a paginate
 * with no `totalCount` available.
 */
export const count = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.length;
  },
});

/** Update your own public profile. */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const patch: { name?: string; bio?: string; avatar?: string } = {};
    if (args.name !== undefined) patch.name = args.name.trim().slice(0, MAX_NAME);
    if (args.bio !== undefined) patch.bio = args.bio.trim().slice(0, MAX_BIO);
    if (args.avatar !== undefined) patch.avatar = args.avatar.slice(0, MAX_AVATAR);

    if (Object.keys(patch).length === 0) return { ok: true };
    await ctx.db.patch(user._id, patch);
    return { ok: true };
  },
});
