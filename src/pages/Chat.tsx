import { PageShell } from "@/components/Layout";
import { ChatRoom } from "@/components/ChatRoom";
import { Eyebrow } from "@/components/SiteChrome";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router";

export default function Chat() {
  const { isAuthenticated } = useAuth();

  return (
    <PageShell>
      <header className="mb-5">
        <Eyebrow>Section four</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Chat</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {isAuthenticated
            ? "A live room for everyone on the site. Messages appear for other people the moment you send them — no refreshing."
            : "A live room for everyone on the site. Sign in to send messages; you can watch the room either way."}
        </p>
        {!isAuthenticated && (
          <p className="mt-3 text-sm">
            <Link to="/auth?mode=signup" className="text-primary hover:underline">
              Create an account
            </Link>{" "}
            <span className="text-muted-foreground">
              — or use a guest sign-in if you just want to say hello.
            </span>
          </p>
        )}
      </header>

      <ChatRoom />
    </PageShell>
  );
}
