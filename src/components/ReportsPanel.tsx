import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ConfirmAction";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, X } from "lucide-react";

/** The open report queue and the audit trail, side by side. */
export function ReportsPanel() {
  const queue = useQuery(api.reports.queue);
  const audit = useQuery(api.reports.audit);
  const resolve = useMutation(api.reports.resolve);

  if (queue === undefined && audit === undefined) {
    return (
      <p className="text-sm text-muted-foreground">Loading the queue…</p>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-border/70 bg-card/60">
        <p className="border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Open reports
        </p>
        {(queue ?? []).length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing reported. Long may it last.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {(queue ?? []).map((report) => (
              <li key={report._id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{report.reason}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(report.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {report.targetType} · reported by {report.reporterName}
                </p>
                {report.details && (
                  <p className="mt-1.5 text-sm text-foreground/85">{report.details}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <ConfirmButton
                    title="Mark this report as handled?"
                    confirmLabel="Confirm"
                    description="This records that you dealt with the report. It does not remove the content."
                    onConfirm={() =>
                      void resolve({ reportId: report._id }).catch(() => undefined)
                    }
                    trigger={
                      <Button size="sm" variant="outline">
                        <ShieldCheck className="size-3.5" />
                        Mark handled
                      </Button>
                    }
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void resolve({ reportId: report._id, dismiss: true }).catch(
                        () => undefined,
                      )
                    }
                  >
                    <X className="size-3.5" />
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border/70 bg-card/60">
        <p className="border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Audit log
        </p>
        {(audit ?? []).length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No staff actions yet.
          </p>
        ) : (
          <ul className="max-h-[420px] divide-y divide-border/40 overflow-y-auto">
            {(audit ?? []).map((row) => (
              <li key={row._id} className="px-4 py-2.5">
                <p className="text-sm">
                  <span className="font-medium">{row.actorName}</span>{" "}
                  <span className="text-muted-foreground">{row.action}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatDistanceToNow(row.createdAt, { addSuffix: true })}
                  {row.detail ? ` · ${row.detail}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
