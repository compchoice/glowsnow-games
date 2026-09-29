import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { achievementByKey, rankForPoints, nextRank } from "@/lib/engagement";

/** A member's earned badges and rank, shown on their profile. */
export function BadgeStrip({ userId }: { userId: string }) {
  const id = userId as Id<"users">;
  const result = useQuery(
    api.achievements.forUser,
    // A malformed id in the URL must not throw during render.
    /^kg2[a-z0-9]{20,}$/.test(userId) ? { userId: id } : "skip",
  );

  if (!result || result.earned.length === 0) return null;

  const rank = rankForPoints(result.points);
  const next = nextRank(result.points);

  return (
    <section className="mt-6 rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {rank.emoji} {rank.name} · {result.points} points
        </p>
        <Link
          to="/leaderboard"
          className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {next
            ? `${next.floor - result.points} to ${next.name}`
            : "Top rank"}
        </Link>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {result.earned.map((key) => {
          const badge = achievementByKey(key);
          if (!badge) return null;
          return (
            <li
              key={key}
              title={`${badge.title} — ${badge.description}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs"
            >
              <span>{badge.emoji}</span>
              {badge.title}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
