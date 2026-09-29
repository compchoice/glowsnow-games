import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/ConfirmAction";
import { describeDuration, parseDuration } from "@/convex/duration";
import { cn } from "@/lib/utils";
import { Clock, ShieldOff, Undo2 } from "lucide-react";

const PRESETS = ["10m", "1h", "12h", "1d", "1w"];
const DESTRUCTIVE =
  "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40";

/**
 * Owner and moderator controls, shown on a member's own profile. Every decision
 * comes from `moderation.abilities` on the server, so this renders only what the
 * signed-in viewer is actually allowed to do — nobody sees controls for their own
 * profile, for peers, or for the owner.
 */
export function ModerationActions({
  userId,
  name,
}: {
  userId: Id<"users">;
  name: string;
}) {
  const abilities = useQuery(api.moderation.abilities, { userId });
  const timeout = useMutation(api.moderation.timeout);
  const ban = useMutation(api.moderation.ban);
  const clear = useMutation(api.moderation.clear);

  const [timeoutOpen, setTimeoutOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [duration, setDuration] = useState("10m");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (
    !abilities ||
    (!abilities.canBan && !abilities.canTimeout && !abilities.canClear)
  ) {
    return null;
  }

  function fail(err: unknown, fallback: string) {
    setError(err instanceof Error && err.message ? err.message : fallback);
  }

  async function submitTimeout(event: React.FormEvent) {
    event.preventDefault();
    const ms = parseDuration(duration);
    if (ms === null) {
      setError("Give a duration like 10m, 2h, 1d or 1w.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await timeout({ userId, durationMs: ms, reason: reason.trim() || undefined });
      setTimeoutOpen(false);
      setReason("");
      setDuration("10m");
    } catch (err) {
      fail(err, "Could not time that member out.");
    } finally {
      setBusy(false);
    }
  }

  async function submitBan() {
    setBusy(true);
    setError(null);
    try {
      await ban({ userId, reason: reason.trim() || undefined });
      setBanOpen(false);
      setReason("");
    } catch (err) {
      fail(err, "Could not ban that member.");
    } finally {
      setBusy(false);
    }
  }

  const parsed = parseDuration(duration);

  return (
    <div className="mt-6 rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Moderation</p>
          <p className="text-xs text-muted-foreground">
            {abilities.active
              ? `${name} is ${
                  abilities.active.kind === "ban" ? "banned" : "timed out"
                } — ${abilities.active.summary}.`
              : `${name} is not moderated.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {abilities.canTimeout && (
            <Dialog open={timeoutOpen} onOpenChange={setTimeoutOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Clock className="size-4" />
                  {abilities.active?.kind === "timeout"
                    ? "Extend timeout"
                    : "Timeout"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={submitTimeout}>
                  <DialogHeader>
                    <DialogTitle>Time {name} out</DialogTitle>
                    <DialogDescription>
                      They can keep reading, but cannot post in chat, the lounge
                      or on games until the timeout lapses.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <label
                        className="text-xs text-muted-foreground"
                        htmlFor={`duration-${userId}`}
                      >
                        How long
                      </label>
                      <Input
                        id={`duration-${userId}`}
                        value={duration}
                        onChange={(event) => setDuration(event.target.value)}
                        placeholder="10m"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setDuration(preset)}
                            className={cn(
                              "rounded-md border px-2 py-1 text-xs transition-colors",
                              duration === preset
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border/70 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        className="text-xs text-muted-foreground"
                        htmlFor={`timeout-reason-${userId}`}
                      >
                        Reason (optional)
                      </label>
                      <Input
                        id={`timeout-reason-${userId}`}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Flooding the room"
                        maxLength={140}
                      />
                    </div>
                  </div>

                  {error && <p className="pb-2 text-sm text-destructive">{error}</p>}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setTimeoutOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={busy}>
                      {busy
                        ? "Working…"
                        : `Silence for ${describeDuration(parsed ?? 0)}`}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {abilities.canClear && (
            <ConfirmButton
              trigger={
                <Button variant="outline" size="sm">
                  <Undo2 className="size-4" />
                  Lift
                </Button>
              }
              title={`Lift moderation for ${name}?`}
              description="They can post again straight away."
              confirmLabel="Lift it"
              onConfirm={async () => {
                setError(null);
                try {
                  await clear({ userId });
                } catch (err) {
                  fail(err, "Could not lift that.");
                }
              }}
            />
          )}

          {abilities.canBan && (
            <Dialog open={banOpen} onOpenChange={setBanOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <ShieldOff className="size-4" />
                  Ban
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ban {name}?</DialogTitle>
                  <DialogDescription>
                    They will not be able to post anywhere on the site. Banning
                    is permanent until somebody with owner access lifts it.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-1.5 py-4">
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor={`ban-reason-${userId}`}
                  >
                    Reason (optional)
                  </label>
                  <Input
                    id={`ban-reason-${userId}`}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Repeated harassment"
                    maxLength={140}
                  />
                </div>

                {error && <p className="pb-2 text-sm text-destructive">{error}</p>}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setBanOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className={DESTRUCTIVE}
                    onClick={() => void submitBan()}
                    disabled={busy}
                  >
                    {busy ? "Working…" : "Ban member"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}
