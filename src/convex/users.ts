import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, hasAnyAdmin, isAdmin, requireAdmin } from "./lib";
import { ROLES, roleValidator } from "./schema";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

/** Is the viewer the owner, and has anyone claimed ownership yet? */
export const adminStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return {
      isAdmin: isAdmin(user),
      hasAdmin: await hasAnyAdmin(ctx),
      signedIn: user !== null,
    };
  },
});

/** Member directory for the admin area. Owner only. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users
      .map((user) => ({
        _id: user._id,
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
        role: user.role ?? ROLES.MEMBER,
        isAnonymous: user.isAnonymous ?? false,
        emailVerificationTime: user.emailVerificationTime ?? null,
      }))
      .sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));
  },
});

/** First signed-in visitor can claim the owner seat while it is still empty. */
export const claimAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Sign in first, then claim the owner seat.");
    if (await hasAnyAdmin(ctx)) {
      return { claimed: false, reason: "An owner already exists." };
    }
    await ctx.db.patch(user._id, { role: ROLES.ADMIN });
    return { claimed: true, reason: "You are now the owner of this site." };
  },
});

export const setRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, { userId, role }) => {
    const me = await requireAdmin(ctx);
    if (me._id === userId && role !== ROLES.ADMIN) {
      throw new Error("You cannot remove your own owner access.");
    }
    await ctx.db.patch(userId, { role });
    return { ok: true };
  },
});

export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Sign in to update your profile.");
    const trimmed = name.trim().slice(0, 40);
    await ctx.db.patch(me._id, { name: trimmed });
    return { ok: true };
  },
});
