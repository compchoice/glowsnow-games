import { useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/Layout";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Eyebrow } from "@/components/SiteChrome";
import { rankForPoints, nextRank, RANKS } from "@/lib/engagement";
import { Trophy } from "lucide-react";

/** The points table, plus every badge and whether you hold it. */
export default function Leaderboard() {
  const { isAuthenticated } = useAuth();
  const board = useQuery(api.achievements.leaderboard);
  const mine = useQuery(api.achievements.mine, isAuthenticated ? {} : "skip");
  const catalogue = useQuery(api.achievements.catalogue);

  const rank = useMemo(
    () => rankForPoints(mine?.points ?? 0),
    [mine?.points],
  );
  const next = useMemo(() => nextRank(mine?.points ?? 0), [mine?.points]);

  return (
    <PageShell>
      <header>
        <Eyebrow>Community</Eyebrow>
        <h1 className="mt-1.5 flex items-center gap-2.5 text-3xl font-semibold tracking-tight">
          <Trophy className="size-7 text-primary" />
          Leaderboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Points come from badges, not from posting more. There is no way to buy
          your way up this table.
        </p>
      </header>

      {isAuthenticated && (
        <div className="mt-6 rounded-xl border border-primary/25 bg-primary/8 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              {rank.emoji} You are a {rank.name}
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {mine?.points ?? 0} points
            </p>
          </div>
          {next ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {next.floor - (mine?.points ?? 0)} more to reach{" "}
              {next.emoji} {next.name}.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              That is the top rank. Nice.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <section className="rounded-xl border border-border/70 bg-card/60">
          <p className="border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Top members
          </p>
          {(board ?? []).length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nobody has earned a badge yet. Be the first.
            </p>
          ) : (
            <ol>
              {(board ?? []).map((row) => (
                <li
                  key={row.userId}
                  className="flex items-center gap-3 border-b border-border/40 px-4 py-3 last:border-0"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                    {row.rank}
                  </span>
                  <MemberAvatar
                    name={row.name}
                    avatar={row.avatar}
                    seed={row.userId}
                  />
                  <Link
                    to={`/u/${row.userId}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium transition-colors hover:text-primary"
                  >
                    {row.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.badges} {row.badges === 1 ? "badge" : "badges"}
                  </span>
                  <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums">
                    {row.points}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-border/70 bg-card/60">
          <p className="border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            All badges
          </p>
          <ul className="divide-y divide-border/40">
            {(catalogue ?? []).map((badge) => (
              <li
                key={badge.key}
                className={`flex items-start gap-3 px-4 py-3 ${
                  badge.earned ? "" : "opacity-45"
                }`}
              >
                <span className="text-xl leading-none">{badge.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {badge.title}
                    {badge.earned && (
                      <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-primary">
                        earned
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {badge.description}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {badge.points}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ranks
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RANKS.map((r) => (
            <span
              key={r.name}
              className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs"
            >
              {r.emoji} {r.name} · {r.floor}+
            </span>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
