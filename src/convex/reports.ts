import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { displayName, getCurrentUser, requireModerator, requireUser } from "./lib";
import { reportTargetValidator } from "./schema";

const MAX_REASON = 60;
const MAX_DETAILS = 500;
const REPORT_SCAN = 50;
const LOG_SCAN = 60;

/** The reasons offered in the report dialog. */
const REASONS = [
  "Harassment",
  "Hate speech",
  "Spam",
  "Self-harm",
  "Something illegal",
  "Other",
] as const;

/** Appends a line to the staff audit log. */
export async function recordAction(
  ctx: MutationCtx,
  actor: Doc<"users">,
  action: string,
  targetId?: string,
  detail?: string,
) {
  await ctx.db.insert("auditLog", {
    actorId: actor._id,
    actorName: displayName(actor),
    action,
    targetId,
    detail,
    createdAt: Date.now(),
  });
}

export const reasons = query({
  args: {},
  handler: async () => REASONS,
});

/** Files a report. One open report per member per target. */
export const create = mutation({
  args: {
    targetType: reportTargetValidator,
    targetId: v.string(),
    reason: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, { targetType, targetId, reason, details }) => {
    const user = await requireUser(ctx);

    const text = reason.trim().slice(0, MAX_REASON);
    if (!text) throw new Error("Say what is wrong.");

    const open = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    const duplicate = open.some(
      (row) =>
        row.targetType === targetType &&
        row.targetId === targetId &&
        row.reporterId === user._id,
    );
    if (duplicate) throw new Error("You have already reported that.");

    const id = await ctx.db.insert("reports", {
      targetType,
      targetId,
      reporterId: user._id,
      reason: text,
      details: details?.trim().slice(0, MAX_DETAILS) || undefined,
      createdAt: Date.now(),
      status: "open",
    });

    return { id };
  },
});

/** What the current member has reported, so a dialog can say "sent". */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("reports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", user._id))
      .order("desc")
      .take(REPORT_SCAN);
    return rows.map((row) => ({ id: row._id, status: row.status, targetId: row.targetId }));
  },
});

/** The open queue. Moderators and up. */
export const queue = query({
  args: {},
  handler: async (ctx) => {
    await requireModerator(ctx);
    const rows = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(REPORT_SCAN);

    return Promise.all(
      rows.map(async (row) => {
        const reporter = await ctx.db.get(row.reporterId);
        return {
          _id: row._id,
          targetType: row.targetType,
          targetId: row.targetId,
          reason: row.reason,
          details: row.details ?? "",
          createdAt: row.createdAt,
          reporterName: reporter ? displayName(reporter) : "Member",
        };
      }),
    );
  },
});

/** Marks a report handled. Moderators and up. */
export const resolve = mutation({
  args: { reportId: v.id("reports"), dismiss: v.optional(v.boolean()) },
  handler: async (ctx, { reportId, dismiss }) => {
    const staff = await requireModerator(ctx);
    const row = await ctx.db.get(reportId);
    if (!row) throw new Error("That report is gone.");

    await ctx.db.patch(reportId, {
      status: dismiss ? "dismissed" : "resolved",
      resolvedBy: staff._id,
      resolvedAt: Date.now(),
    });

    await recordAction(
      ctx,
      staff,
      dismiss ? "dismissed-report" : "resolved-report",
      row.targetId,
      row.reason,
    );

    return { ok: true };
  },
});

/**
 * The audit trail: every kick, ban, timeout, report answer and role change, in
 * one list. Moderators and up. This is deliberately append-only from the
 * client's point of view — nothing here can be edited or deleted in the UI.
 */
export const audit = query({
  args: {},
  handler: async (ctx) => {
    await requireModerator(ctx);
    const rows = await ctx.db
      .query("auditLog")
      .withIndex("by_createdAt")
      .order("desc")
      .take(LOG_SCAN);

    return rows.map((row) => ({
      _id: row._id,
      actorName: row.actorName,
      action: row.action,
      targetId: row.targetId ?? null,
      detail: row.detail ?? null,
      createdAt: row.createdAt,
    }));
  },
});
