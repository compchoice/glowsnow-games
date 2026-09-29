import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export type ReportTarget = {
  type: "chat" | "lounge" | "review" | "poll" | "user";
  id: string;
  label: string;
};

/**
 * Files a report. The reasons come from the server so the list cannot drift
 * from what staff see, and a member who already reported the same thing is told
 * rather than allowed to pile duplicates onto the queue.
 */
export function ReportDialog({
  target,
  open,
  onOpenChange,
}: {
  target: ReportTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isAuthenticated } = useAuth();
  const reasons = useQuery(api.reports.reasons);
  const mine = useQuery(api.reports.mine, isAuthenticated ? {} : "skip");
  const create = useMutation(api.reports.create);

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const alreadySent =
    !!target && !!mine?.some((row) => row.targetId === target.id);

  async function submit() {
    if (!target) return;
    if (!reason) {
      setError("Pick what is wrong.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await create({
        targetType: target.type,
        targetId: target.id,
        reason,
        details: details || undefined,
      });
      setDone(true);
      setReason("");
      setDetails("");
      // Let the subscription catch up before the dialog offers to close.
      setTimeout(() => onOpenChange(false), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setDone(false);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this</DialogTitle>
          <DialogDescription>
            Reports go to the moderators and the owner. They will not tell anyone
            who sent it.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
            Thanks — the moderators have it.
          </p>
        ) : alreadySent ? (
          <p className="text-sm text-muted-foreground">
            You have already reported this. A moderator will take it from here.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {target?.label}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">What is wrong?</p>
              <div className="flex flex-wrap gap-2">
                {(reasons ?? []).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setReason(option)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      reason === option
                        ? "border-primary/50 bg-primary/15 text-foreground"
                        : "border-border/70 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Anything else? (optional)</p>
              <Textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Add anything that would help."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && !alreadySent && (
            <Button onClick={submit} disabled={busy || !isAuthenticated}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Send report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
