import { useState } from "react";
import { Link, NavLink as RouterNavLink, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { DEV_COMMANDS } from "@/lib/dev-commands";
import { sendToConsole } from "@/lib/console-bridge";
import { SettingsMenu } from "@/components/SettingsMenu";
import { RestrictedBanner } from "@/components/RestrictedBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { MemberAvatar } from "@/components/MemberAvatar";
import { MemberCount } from "@/components/MemberCount";
import { Button } from "@/components/ui/button";
import { NAV_LINKS, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { LogOut, Menu, LayoutDashboard, Lightbulb, Sparkles, X } from "lucide-react";

/** Snowflakes drifting across the wordmark. Decorative, so hidden from AT. */
const FLAKES = [
  { left: "14%", top: "-30%", duration: "4.5s", delay: "0s" },
  { left: "44%", top: "-45%", duration: "5.5s", delay: "1.3s" },
  { left: "76%", top: "-25%", duration: "6.2s", delay: "2.7s" },
];

function Wordmark() {
  return (
    <span className="relative inline-block">
      <span className="wordmark text-base font-semibold tracking-tight">
        Dex:Active
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0">
        {FLAKES.map((flake) => (
          <span
            key={flake.left}
            className="wordmark-flake absolute size-[3px] rounded-full"
            style={{
              left: flake.left,
              top: flake.top,
              backgroundColor: "color-mix(in oklab, var(--glow) 85%, white)",
              boxShadow: "0 0 6px color-mix(in oklab, var(--glow) 70%, transparent)",
              animation: `snow-drift ${flake.duration} ${flake.delay} linear infinite`,
            }}
          />
        ))}
      </span>
    </span>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </span>
      <Wordmark />
    </Link>
  );
}

export function SiteHeader() {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const status = useQuery(
    api.users.adminStatus,
    isAuthenticated ? {} : "skip",
  );

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-lg px-3 py-1.5 text-sm transition-colors",
      isActive
        ? "bg-accent text-foreground"
        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Brand />

        <nav className="ml-2 hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((link) => (
            <RouterNavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </RouterNavLink>
          ))}
          {status?.isAdmin && (
            <RouterNavLink to="/admin" className={linkClass}>
              Admin
            </RouterNavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <SettingsMenu />
          {isAuthenticated && <NotificationBell />}
          {isAuthenticated ? (
            <>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden border-border/70 sm:inline-flex"
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="size-4" />
                  {user?.name?.split(" ")[0] ?? "Dashboard"}
                </Link>
              </Button>
              {user && (
                <Link
                  to={`/u/${user._id}`}
                  className="hidden sm:block"
                  aria-label="Your profile"
                  title="Your profile"
                >
                  <MemberAvatar
                    name={user.name ?? "Member"}
                    avatar={user.avatar ?? null}
                    seed={user._id}
                    size="sm"
                  />
                </Link>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="outline" className="hidden border-border/70 sm:inline-flex">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth?mode=signup">Get started</Link>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            className="border-border/70 md:hidden"
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-border/70 px-4 py-2 md:hidden">
          {[...NAV_LINKS, ...(status?.isAdmin ? [{ label: "Admin", to: "/admin" }] : [])].map(
            (link) => (
              <RouterNavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </RouterNavLink>
            ),
          )}
          {isAuthenticated && user && (
            <RouterNavLink
              to={`/u/${user._id}`}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Your profile
            </RouterNavLink>
          )}
          <RouterNavLink
            to={isAuthenticated ? "/dashboard" : "/auth"}
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {isAuthenticated ? "Dashboard" : "Sign in"}
          </RouterNavLink>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const requests = useQuery(api.requests.list);
  const status = useQuery(api.users.adminStatus);
  const canModerate = status?.isModerator ?? false;

  const open = (requests ?? []).filter((row) => row.status === "open").length;
  const latest = (requests ?? []).slice(0, 2);

  return (
    <footer className="mt-20 border-t border-border/70 bg-card/40">
      <div
        className={cn(
          "mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6",
          canModerate
            ? "md:grid-cols-[1.4fr_1fr_1fr]"
            : "md:grid-cols-[1.4fr_1fr]",
        )}
      >
        <div>
          <Brand />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {SITE_TAGLINE} Built for one owner and the people who drop by.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/dashboard"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Suggestions
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Want a game added, or a bit of the interface changed? Ask on the
            board — moderators and the owner reply there.
          </p>
          {latest.map((row) => (
            <Link
              key={row._id}
              to="/requests"
              className="mt-2 block truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {row.status === "done" ? "✓ " : ""}
              {row.title}
            </Link>
          ))}
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to="/requests">
              <Lightbulb className="size-4" />
              {open > 0 ? `${open} open` : "Ask for something"}
            </Link>
          </Button>
        </div>

        {/* Staff only: the command list hands out console shortcuts, so members
            and guests never see it. */}
        {canModerate && (
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Developer commands
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The console sits in the bottom-left corner. Summon it with{" "}
              <kbd className="rounded border border-border/70 bg-muted px-1.5 py-0.5 text-[11px]">
                Ctrl + `
              </kbd>{" "}
              or the terminal button. Click any command to load it.
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {DEV_COMMANDS.map((command) => (
                <li key={command.cmd}>
                  <button
                    type="button"
                    onClick={() =>
                      sendToConsole(
                        `${command.cmd}${command.args ? ` ${command.args}` : ""}`,
                      )
                    }
                    className="flex w-full gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-accent/60"
                  >
                    <code className="shrink-0 text-primary">
                      {command.cmd}
                      {command.args ? ` ${command.args}` : ""}
                    </code>
                    <span className="text-muted-foreground">— {command.desc}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
        <MemberCount />
        <span>
          {new Date().getFullYear()} {SITE_NAME} · press{" "}
          <kbd className="rounded border border-border/70 bg-muted px-1 py-0.5">
            Esc
          </kbd>{" "}
          to disguise the tab
        </span>
      </div>
    </footer>
  );
}

/** Standard page frame: header, content, footer. */
export function PageShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative z-[2] flex min-h-screen flex-col">
      <RestrictedBanner />
      <SiteHeader />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "mx-auto w-full flex-1 px-4 py-10 sm:px-6",
          wide ? "max-w-6xl" : "max-w-5xl",
        )}
      >
        {children}
      </motion.main>
      <SiteFooter />
    </div>
  );
}
