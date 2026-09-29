import { motion } from "framer-motion";
import { GameCard } from "@/components/GameCard";
import { ProxyCard } from "@/components/ProxyCard";
import { CloakMenu, SnowToggle } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/site";
import { useAuth } from "@/hooks/use-auth";
import { Gamepad2, LayoutDashboard, Sparkles } from "lucide-react";
import { Link } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative z-[2] min-h-screen"
    >
      {/* ---- Top footer ---- */}
      <header className="sticky top-0 z-40 border-b border-primary/20 bg-[oklch(0.13_0.04_293_/_0.75)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <a href="#top" className="flex items-center gap-2 shrink-0">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 ring-glow">
              <Sparkles className="size-5 text-primary" />
            </span>
            <span className="hidden font-bold tracking-tight sm:block">
              {SITE_NAME}
            </span>
          </a>

          {/* Footer 1: Games · Footer 2: Proxy */}
          <nav className="ml-2 flex items-center gap-2">
            <a
              href="#games"
              className="group flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-sm font-medium text-foreground/85 transition hover:border-primary/50 hover:bg-primary/15 hover:text-primary"
            >
              <span className="text-[10px] font-bold text-primary/60">1</span>
              Games
              <Gamepad2 className="size-3.5 text-primary/70 transition group-hover:text-primary" />
            </a>
            <a
              href="#proxy"
              className="group flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-sm font-medium text-foreground/85 transition hover:border-primary/50 hover:bg-primary/15 hover:text-primary"
            >
              <span className="text-[10px] font-bold text-primary/60">2</span>
              Proxy
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <SnowToggle />
            <CloakMenu />
            {isAuthenticated ? (
              <Button asChild size="sm" variant="ghost" className="text-primary hover:text-primary">
                <Link to="/dashboard">
                  <LayoutDashboard className="size-4" />
                  <span className="hidden sm:inline">Owner</span>
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="glow-sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section id="top" className="mx-auto w-full max-w-5xl px-4 pb-10 pt-16 sm:pt-24">
        <div className="relative text-center">
          <div
            aria-hidden
            className="animate-glow-pulse pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[110px]"
          />
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Sparkles className="size-3.5" />
            unblocked · built for the community
          </motion.p>
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="glow-text mx-auto mt-6 max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl"
          >
            The arcade that slips past the firewall
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
          >
            {SITE_NAME} wraps Friday Night Funkin&apos; and a private Brave
            search proxy in one glowing, snow-dusted tab that looks like
            homework if anyone walks by.
          </motion.p>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild size="lg" className="glow-md h-12 px-7 text-base">
              <a href="#games">
                <Gamepad2 className="size-5" />
                Start playing
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-primary/35 bg-card/40 px-7 text-base backdrop-blur-md hover:bg-primary/10 hover:text-primary"
            >
              <a href="#proxy">Open the proxy</a>
            </Button>
          </motion.div>
        </div>

        {/* stat strip */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.55, delay: 0.32 }}
          className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-primary/20 bg-primary/15 text-center backdrop-blur-md"
        >
          {[
            ["100%", "free to play"],
            ["0", "downloads needed"],
            ["Esc", "panic cloak"],
          ].map(([big, small]) => (
            <div key={small} className="bg-[oklch(0.13_0.04_293_/_0.72)] px-3 py-4">
              <p className="glow-text text-lg font-bold text-primary sm:text-2xl">{big}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{small}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ---- Sections ---- */}
      <main className="mx-auto w-full max-w-5xl space-y-14 px-4 pb-16 pt-6">
        <GameCard />
        <ProxyCard />
      </main>

      {/* ---- Bottom footer: dev cmds on the left ---- */}
      <footer className="border-t border-primary/20 bg-[oklch(0.13_0.04_293_/_0.8)] backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
              Developer cmds
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["snow on|off", "toggle the droplets"],
                ["cloak <preset>", "disguise the tab"],
                ["status", "current settings"],
                ["clear", "wipe the console"],
                ["exit", "close console"],
              ].map(([cmd, desc]) => (
                <span
                  key={cmd}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-xs"
                >
                  <code className="font-mono text-primary">{cmd}</code>
                  <span className="text-muted-foreground">— {desc}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Console lives bottom-left · summon with{" "}
              <kbd className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                Ctrl + `
              </kbd>{" "}
              · type <code className="font-mono text-primary">help</code>
            </p>
          </div>

          <div className="text-sm text-muted-foreground sm:text-right">
            <p className="font-semibold text-foreground/90">{SITE_NAME}</p>
            <p className="mt-1">
              {new Date().getFullYear()} · made for the community, by the owner
            </p>
            <p className="mt-2 text-xs">
              Press{" "}
              <kbd className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                Esc
              </kbd>{" "}
              anytime for the panic cloak
            </p>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
