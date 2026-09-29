import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert } from "lucide-react";

/**
 * A quiet strip shown on every page while a member is silenced or banned, so
 * they find out why their messages are not going through without having to
 * guess. Only ever renders for the person it applies to.
 */
export function RestrictedBanner() {
  const { isAuthenticated } = useAuth();
  const status = useQuery(
    api.moderation.myStatus,
    isAuthenticated ? {} : "skip",
  );

  if (!status) return null;

  const banned = status.kind === "ban";

  return (
    <div
      className="border-b border-destructive/30 bg-destructive/10"
      role="status"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6">
        <ShieldAlert className="size-4 shrink-0 text-destructive" />
        <span className="text-foreground/90">
          {banned
            ? "Your account is banned from posting on this site."
            : `You are silenced for another ${status.summary}.`}
        </span>
        {status.reason && (
          <span className="text-muted-foreground">Reason: {status.reason}</span>
        )}
        <Link
          to="/restricted"
          className="ml-auto shrink-0 font-medium text-destructive hover:underline"
        >
          Details
        </Link>
      </div>
    </div>
  );
}
