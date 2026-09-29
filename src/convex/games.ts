import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, slugify } from "./lib";

const gameInput = {
  slug: v.optional(v.string()),
  title: v.string(),
  category: v.string(),
  description: v.string(),
  tags: v.array(v.string()),
  embedUrl: v.string(),
  playUrl: v.string(),
  featured: v.boolean(),
};

/** Every game in the catalog, featured first then alphabetical. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db.query("games").collect();
    return games.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("games")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

/** Create a game, or update it when the slug already exists. Owner only. */
export const upsert = mutation({
  args: gameInput,
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const slug = slugify(args.slug?.trim() || args.title);
    if (!slug) throw new Error("A title is required.");
    if (!args.embedUrl.trim()) throw new Error("An embed URL is required.");

    const payload = {
      title: args.title.trim(),
      category: args.category.trim() || "Arcade",
      description: args.description.trim(),
      tags: args.tags.map((tag) => tag.trim()).filter(Boolean),
      embedUrl: args.embedUrl.trim(),
      playUrl: (args.playUrl.trim() || args.embedUrl).trim(),
      featured: args.featured,
    };

    const existing = await ctx.db
      .query("games")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...payload, updatedAt: Date.now() });
      return { id: existing._id, slug, created: false };
    }

    const id = await ctx.db.insert("games", {
      ...payload,
      slug,
      addedBy: user._id,
      createdAt: Date.now(),
    });
    return { id, slug, created: true };
  },
});

export const remove = mutation({
  args: { id: v.id("games") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
    return { ok: true };
  },
});

export const setFeatured = mutation({
  args: { id: v.id("games"), featured: v.boolean() },
  handler: async (ctx, { id, featured }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { featured, updatedAt: Date.now() });
    return { ok: true };
  },
});

/** Bulk-import the built-in starter catalog. Owner only. */
export const importDefaults = mutation({
  args: {
    games: v.array(
      v.object({
        slug: v.string(),
        title: v.string(),
        category: v.string(),
        description: v.string(),
        tags: v.array(v.string()),
        embedUrl: v.string(),
        playUrl: v.string(),
        featured: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, { games }) => {
    const user = await requireAdmin(ctx);
    let inserted = 0;
    for (const game of games) {
      const existing = await ctx.db
        .query("games")
        .withIndex("by_slug", (q) => q.eq("slug", game.slug))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { ...game, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("games", {
          ...game,
          addedBy: user._id,
          createdAt: Date.now(),
        });
        inserted += 1;
      }
    }
    return { inserted, total: games.length };
  },
});
