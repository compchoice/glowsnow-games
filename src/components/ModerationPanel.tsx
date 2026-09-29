import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemberDirectory } from "@/hooks/use-directory";
import { findMember, searchMembers } from "@/lib/members";
import { parseDuration } from "@/convex/duration";
import { ShieldAlert, ShieldCheck } from "lucide-react";

/**
 * The owner's moderation desk: who is currently silenced or banned, a way to
 * lift it, and a quick form to start a new one without leaving the page.
 */
export function ModerationPanel() {
  const rows = useQuery(api.moderation.list);
  const members = useQuery(api.users.list, {});
  const directory = useMemberDirectory();
  const clear = useMutation(api.moderation.clear);
  const ban = useMutation(api.moderation.ban);
  const timeout = useMutation(api.moderation.timeout);

  // users.list allows a null name; the lookup helpers want something printable.
  const people = useMemo(
    () =>
      (members ?? []).map((member) => ({
        _id: member._id as string,
        name: member.name ?? member.email ?? "Member",
      })),
    [members],
  );

  const [who, setWho] = useState("");
  const [forHow, setForHow] = useState("10m");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(action: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(kind: "ban" | "timeout") {
    const match = findMember(who, people);
    if (!match) {
      const close = searchMembers(who, people).slice(0, 5);
      setError(
        close.length
          ? `No single member matches “${who}”. Did you mean: ${close.map((m) => m.name).join(", ")}?`
          : `No member matches “${who}”.`,
      );
      return;
    }
    const ms = parseDuration(forHow);
    if (kind === "timeout" && ms === null) {
      setError("Give a duration like 10m, 2h or 1d.");
      return;
    }

    await act(
      () =>
        kind === "ban"
          ? ban({ userId: match._id as Id<"users">, reason: reason || undefined })
          : timeout({
              userId: match._id as Id<"users">,
              durationMs: ms as number,
              reason: reason || undefined,
            }),
      "Could not moderate that member.",
    );
    setWho("");
    setReason("");
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card/60 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <ShieldAlert className="size-4 text-primary" />
        Moderation
      </h2>

      {/* Quick actions */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_7rem_1fr_auto]">
        <Input
          value={who}
          onChange={(event) => setWho(event.target.value)}
          placeholder="Member name"
          aria-label="Member name"
        />
        <Input
          value={forHow}
          onChange={(event) => setForHow(event.target.value)}
          placeholder="10m"
          aria-label="Duration"
        />
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (optional)"
          aria-label="Reason"
          maxLength={140}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !who.trim()}
            onClick={() => void handleAdd("timeout")}
          >
            Timeout
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={busy || !who.trim()}
            onClick={() => void handleAdd("ban")}
          >
            Ban
          </Button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {notice && <p className="mt-2 text-sm text-primary">{notice}</p>}

      {/* Current state */}
      <div className="mt-5">
        {rows === undefined ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody is moderated right now.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {rows.map((row) => (
              <li
                key={row._id}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/u/${row.userId}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {row.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {row.kind === "ban" ? "Banned" : "Timed out"} · {row.summary}
                    {row.reason ? ` · ${row.reason}` : ""} ·{" "}
                    {formatDistanceToNow(new Date(row.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      () => clear({ userId: row.userId as Id<"users"> }),
                      "Could not lift that.",
                    )
                  }
                >
                  <ShieldCheck className="size-4" />
                  Lift
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Roster for reference */}
      {directory.size > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          {directory.size} members have profiles on the site. Use a name above,
          or open somebody&apos;s profile to ban or time them out.
        </p>
      )}
    </section>
  );
}
