import { PageShell } from "@/components/Layout";
import { Messages } from "@/components/Messages";
import { Eyebrow } from "@/components/SiteChrome";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router";

export default function Community() {
  const { isAuthenticated, user } = useAuth();

  return (
    <PageShell>
      <header>
        <Eyebrow>The lounge</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          Community
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {isAuthenticated
            ? `Post a message, reply to anyone, and comment on games. Signed in as ${user?.name ?? user?.email ?? "a member"}.`
            : "Everything here is public to read. Sign in to post a message, reply, or leave comments on games."}
        </p>
        {!isAuthenticated && (
          <p className="mt-3 text-sm">
            <Link to="/auth?mode=signup" className="text-primary hover:underline">
              Create an account
            </Link>{" "}
            <span className="text-muted-foreground">
              — it takes about ten seconds.
            </span>
          </p>
        )}
      </header>

      <div className="mt-6">
        <Messages
          scope="community"
          emptyText="The lounge is empty. Be the first to say something."
        />
      </div>
    </PageShell>
  );
}
