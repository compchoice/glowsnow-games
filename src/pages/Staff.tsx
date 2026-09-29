import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageShell } from "@/components/Layout";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { UserLookup } from "@/components/UserLookup";
import { ModerationPanel } from "@/components/ModerationPanel";
import { ReportsPanel } from "@/components/ReportsPanel";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router";

/**
 * The staff desk. Open to moderators and the owner — the owner-only /admin area
 * handles the catalog and roles, so this is the half moderators can reach.
 */
export default function Staff() {
  const { isLoading } = useAuth();
  const status = useQuery(api.users.adminStatus);
  const muted = useQuery(api.moderation.list, status?.isModerator ? {} : "skip");
  const active = muted?.length ?? 0;

  if (isLoading) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </PageShell>
    );
  }

  if (!status?.isModerator) {
    return (
      <PageShell>
        <Eyebrow>Staff only</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          Moderator access required
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          This desk lets moderators and the owner look members up, and kick or ban
          them. If that&apos;s you, ask the owner for the moderator role.
        </p>
        <Button asChild className="mt-5">
          <Link to="/">Back home</Link>
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell wide>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Staff desk</Eyebrow>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
            Moderation
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {status.isAdmin
              ? "As the owner you can ban permanently, or kick somebody for an hour."
              : "You can kick somebody (an hour, lifts itself) or silence them for a set time. Banning is the owner's call."}{" "}
            {active > 0
              ? `${active} ${active === 1 ? "member is" : "members are"} restricted right now.`
              : "Nobody is restricted right now."}
          </p>
        </div>
        {status.isAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link to="/admin">Open the owner area</Link>
          </Button>
        )}
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <UserLookup />
        <ModerationPanel />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What members have flagged, and a record of every staff action.
        </p>
        <div className="mt-4">
          <ReportsPanel />
        </div>
      </div>
    </PageShell>
  );
}
