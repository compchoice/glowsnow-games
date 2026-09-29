import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * How many people have signed up. A deliberately quiet pill: small enough to sit
 * out of the way in the footer, with the icon in the accent colour so it still
 * reads at a glance.
 */
export function MemberCount({ className }: { className?: string }) {
  const members = useQuery(api.profiles.count);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-2.5 py-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <Users className="size-3.5 shrink-0 text-primary" aria-hidden />
      {members === undefined
        ? "…"
        : `${members.toLocaleString()} ${members === 1 ? "member" : "members"}`}
    </span>
  );
}
