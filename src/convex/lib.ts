import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ROLES } from "./schema";

type Ctx = QueryCtx | MutationCtx;

/** The signed-in user document, or null when nobody is signed in. */
export async function getCurrentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
}

/** Same as getCurrentUser, but throws a friendly error when signed out. */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Sign in to do that.");
  return user;
}

export function isAdmin(user: Doc<"users"> | null): boolean {
  return user?.role === ROLES.ADMIN;
}

/** Gate for every owner-only mutation. */
export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!isAdmin(user)) {
    throw new Error("Owner access is required for that action.");
  }
  return user;
}

/** Public name shown next to a message. */
export function displayName(user: Doc<"users">): string {
  const name = user.name?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email.split("@")[0];
  return "Member";
}

export async function hasAnyAdmin(ctx: Ctx): Promise<boolean> {
  const users = await ctx.db.query("users").collect();
  return users.some((user) => user.role === ROLES.ADMIN);
}

/** Normalizes a title into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
