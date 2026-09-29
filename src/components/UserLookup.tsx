import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/MemberAvatar";
import { useAuth } from "@/hooks/use-auth";
import { ConfirmButton } from "@/components/ConfirmAction";
import { cn } from "@/lib/utils";
import { Crown, LogIn, Search, Shield, ShieldOff, UserMinus } from "lucide-react";

function timeAgo(timestamp: number | null): string {
  if (timestamp === null) return "never seen";
  const ms = Date.now() - timestamp;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Find a member and decide what to do about them, in one place. Kicking is open
 * to moderators because it lapses on its own; banning is owner-only because it
 * does not. Nothing renders unless the server says this viewer is allowed.
 */
export function UserLookup() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const found = useQuery(
    api.lookup.search,
    searched ? { query: searched } : "skip",
  );
  const status = useQuery(api.users.adminStatus);

  const kick = useMutation(api.moderation.kick);
  const ban = useMutation(api.moderation.ban);
  const clear = useMutation(api.moderation.clear);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = status?.isAdmin ?? false;
  const isMod = status?.isModerator ?? false;

  async function run(action: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  const results = found?.results ?? [];
  const canAct = isMod;

  return (
    <section className="rounded-xl border border-border/70 bg-card/60 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Search className="size-4 text-primary" />
        Look someone up
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Search by name or email to see whether they are around right now, then
        kick or ban them.
      </p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSearched(query.trim());
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ana, ana@example.com…"
          aria-label="Search for a member"
        />
        <Button type="submit" size="sm" disabled={!query.trim()}>
          Search
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      {searched && found === undefined && (
        <p className="mt-3 text-sm text-muted-foreground">Searching…</p>
      )}

      {searched && found !== undefined && results.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Nobody matches “{searched}”.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {results.map((person) => {
          const isSelf = person._id === user?._id;
          return (
            <li
              key={person._id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5"
            >
              <MemberAvatar name={person.name} seed={person._id} size="sm" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/u/${person._id}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {person.name}
                  </Link>
                  {person.role === "admin" && (
                    <Crown className="size-3.5 text-primary" />
                  )}
                  {person.role === "moderator" && (
                    <Shield className="size-3.5 text-primary" />
                  )}
                  {person.moderated && (
                    <span className="rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
                      restricted
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-0.5 flex items-center gap-1.5 text-xs",
                    person.online
                      ? "text-emerald-400"
                      : person.recent
                        ? "text-muted-foreground"
                        : "text-muted-foreground/70",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      person.online
                        ? "bg-emerald-400"
                        : person.recent
                          ? "bg-muted-foreground"
                          : "bg-muted-foreground/40",
                    )}
                  />
                  {person.online ? "active now" : `last seen ${timeAgo(person.lastSeenAt)}`}
                  <span className="text-muted-foreground/60">
                    · {person.posts} posts · {person.chatLines} chat lines
                  </span>
                </p>
              </div>

              <div className="flex shrink-0 gap-1.5">
                {!isSelf && canAct && (
                  <>
                    <ConfirmButton
                      trigger={
                        <Button size="sm" variant="outline" disabled={busy}>
                          <UserMinus className="size-3.5" />
                          Kick
                        </Button>
                      }
                      title={`Kick ${person.name}?`}
                      description="They cannot post for an hour, then it lapses on its own. Any moderator can lift it sooner."
                      confirmLabel="Kick for 1 hour"
                      onConfirm={() =>
                        run(
                          () =>
                            kick({
                              userId: person._id as Id<"users">,
                            }),
                          "Could not kick that member.",
                        )
                      }
                    />
                    {isAdmin && (
                      <ConfirmButton
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={busy}
                          >
                            <ShieldOff className="size-3.5" />
                            Ban
                          </Button>
                        }
                        title={`Ban ${person.name}?`}
                        description="Permanent. They will not be able to post anywhere until you lift it."
                        confirmLabel="Ban"
                        onConfirm={() =>
                          run(
                            () => ban({ userId: person._id as Id<"users"> }),
                            "Could not ban that member.",
                          )
                        }
                      />
                    )}
                    {person.moderated && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => clear({ userId: person._id as Id<"users"> }),
                            "Could not lift that.",
                          )
                        }
                      >
                        <LogIn className="size-3.5" />
                        Lift
                      </Button>
                    )}
                  </>
                )}
                {!canAct && (
                  <span className="text-xs text-muted-foreground">
                    Staff only
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
