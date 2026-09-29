import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib";
import { checkAnnouncement } from "../lib/announcement";

/**
 * The live announcement. Public, because the landing hero is public — an empty
 * result is the normal case, and the hero falls back to its own copy.
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("active", true))
      .order("desc")
      .first();

    if (!row) return null;
    return {
      message: row.message,
      linkTo: row.linkTo ?? null,
      linkLabel: row.linkLabel ?? null,
      createdAt: row.createdAt,
    };
  },
});

/** Posts an announcement, retiring whichever one was live. Owner only. */
export const set = mutation({
  args: {
    message: v.string(),
    linkTo: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
  },
  handler: async (ctx, { message, linkTo, linkLabel }) => {
    const admin = await requireAdmin(ctx);

    const check = checkAnnouncement(message, linkTo ?? "", linkLabel ?? "");
    if (!check.ok) throw new Error(check.error);

    // Retire the old one rather than deleting it, so the history of what was
    // announced is not lost.
    const live = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    for (const row of live) {
      await ctx.db.patch(row._id, { active: false });
    }

    const id = await ctx.db.insert("announcements", {
      message: check.announcement.message,
      linkTo: check.announcement.linkTo ?? undefined,
      linkLabel: check.announcement.linkLabel ?? undefined,
      by: admin._id,
      createdAt: Date.now(),
      active: true,
    });

    return { id };
  },
});

/** Takes the announcement down; the hero falls back to its own copy. */
export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const live = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    for (const row of live) {
      await ctx.db.patch(row._id, { active: false });
    }
    return { ok: true };
  },
});
