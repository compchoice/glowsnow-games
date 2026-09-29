import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser, requireUser } from "./lib";

const MAX_NAME = 40;
const MAX_GAMES = 60;

/** The signed-in member's playlists, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("playlists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return rows.map((row) => ({
      _id: row._id,
      name: row.name,
      slugs: row.slugs,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    }));
  },
});

/** Loads a playlist and refuses anyone who does not own it. */
async function ownedPlaylist(
  ctx: MutationCtx,
  user: Doc<"users">,
  id: Id<"playlists">,
): Promise<Doc<"playlists">> {
  const playlist = await ctx.db.get(id);
  if (!playlist) throw new Error("That playlist no longer exists.");
  if (playlist.userId !== user._id) {
    throw new Error("That playlist belongs to someone else.");
  }
  return playlist;
}

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await requireUser(ctx);
    const trimmed = name.trim().slice(0, MAX_NAME);
    if (!trimmed) throw new Error("Give the playlist a name.");

    const id = await ctx.db.insert("playlists", {
      userId: user._id,
      name: trimmed,
      slugs: [],
      createdAt: Date.now(),
    });
    return { id };
  },
});

export const rename = mutation({
  args: { id: v.id("playlists"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const user = await requireUser(ctx);
    const playlist = await ownedPlaylist(ctx, user, id);
    const trimmed = name.trim().slice(0, MAX_NAME);
    if (!trimmed) throw new Error("Give the playlist a name.");
    await ctx.db.patch(playlist._id, { name: trimmed, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { id: v.id("playlists") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const playlist = await ownedPlaylist(ctx, user, id);
    await ctx.db.delete(playlist._id);
    return { ok: true };
  },
});

export const addGame = mutation({
  args: { id: v.id("playlists"), gameSlug: v.string() },
  handler: async (ctx, { id, gameSlug }) => {
    const user = await requireUser(ctx);
    const playlist = await ownedPlaylist(ctx, user, id);
    const slug = gameSlug.trim().slice(0, 80);
    if (!slug) throw new Error("A game is required.");
    if (playlist.slugs.includes(slug)) return { added: false };
    if (playlist.slugs.length >= MAX_GAMES) {
      throw new Error(`A playlist holds at most ${MAX_GAMES} games.`);
    }

    await ctx.db.patch(playlist._id, {
      slugs: [...playlist.slugs, slug],
      updatedAt: Date.now(),
    });
    return { added: true };
  },
});

export const removeGame = mutation({
  args: { id: v.id("playlists"), gameSlug: v.string() },
  handler: async (ctx, { id, gameSlug }) => {
    const user = await requireUser(ctx);
    const playlist = await ownedPlaylist(ctx, user, id);
    await ctx.db.patch(playlist._id, {
      slugs: playlist.slugs.filter((slug) => slug !== gameSlug),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});
