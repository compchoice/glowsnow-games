import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { PageShell } from "@/components/Layout";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert, ShieldCheck } from "lucide-react";

/**
 * Explains a silence or ban to the member it applies to. It reads only their
 * own record, so it can never be used to inspect anybody else's.
 */
export default function Restricted() {
  const { isAuthenticated, isLoading } = useAuth();
  const status = useQuery(
    api.moderation.myStatus,
    isAuthenticated ? {} : "skip",
  );

  if (isLoading) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Checking…</p>
      </PageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageShell>
        <Eyebrow>Nothing to see</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          You&apos;re not restricted
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page only has something to say if you are signed in and currently
          silenced.
        </p>
        <Button asChild className="mt-5">
          <Link to="/">Back home</Link>
        </Button>
      </PageShell>
    );
  }

  if (!status) {
    return (
      <PageShell>
        <Eyebrow>All clear</Eyebrow>
        <h1 className="mt-1.5 flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <ShieldCheck className="size-7 text-primary" />
          You&apos;re free to post
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          There is no restriction on your account right now. You can post in the
          chat, the lounge, and on games as usual.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/chat">Go to the chat</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/community">Open the lounge</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const banned = status.kind === "ban";

  return (
    <PageShell>
      <Eyebrow>Account restricted</Eyebrow>
      <h1 className="mt-1.5 flex items-center gap-2 text-3xl font-semibold tracking-tight">
        <ShieldAlert className="size-7 text-destructive" />
        {banned ? "You have been banned" : "You have been silenced"}
      </h1>

      <div className="mt-4 max-w-xl rounded-xl border border-border/70 bg-card/60 p-5">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Reason</dt>
            <dd className="mt-0.5">
              {status.reason ?? "No reason was given."}
            </dd>
          </div>
          {!banned && status.until && (
            <div>
              <dt className="text-muted-foreground">Lifts</dt>
              <dd className="mt-0.5">
                {formatDistanceToNow(new Date(status.until), {
                  addSuffix: true,
                })}{" "}
                ({new Date(status.until).toLocaleString()})
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Started</dt>
            <dd className="mt-0.5">
              {formatDistanceToNow(new Date(status.createdAt), {
                addSuffix: true,
              })}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-5 max-w-xl text-sm text-muted-foreground">
        {banned
          ? "You can still read everything on the site, but you cannot post in the chat, the lounge, or on games. Only the site owner can lift a ban."
          : "While this is in place you can still read everything, but you cannot post in the chat, the lounge, or on games. It lifts on its own."}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/">Back home</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/requests">Ask the owner about it</Link>
        </Button>
      </div>
    </PageShell>
  );
}
