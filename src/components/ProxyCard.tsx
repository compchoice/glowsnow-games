import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAVE_SEARCH_URL } from "@/lib/site";
import { Search, ArrowUpRight } from "lucide-react";

const SUGGESTIONS = [
  "friday night funkin mods",
  "cool math games",
  "how to beat week 7",
  "browser games",
];

/**
 * Version-1 Proxy section: Brave Search.
 * Searching opens a brand-new tab so no network filter can tie the results
 * page back to this site, and Brave's results can never frame-break.
 */
export function ProxyCard() {
  const [query, setQuery] = useState("");

  function go(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    window.open(`${BRAVE_SEARCH_URL}${encodeURIComponent(trimmed)}`, "_blank", "noopener");
  }

  return (
    <section id="proxy" className="scroll-mt-24">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
            02 — Proxy
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            The Frozen Web
          </h2>
        </div>
        <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary/90 sm:block">
          powered by Brave
        </span>
      </header>

      <div className="overflow-hidden rounded-2xl ring-glow">
        <div className="bg-card/70 p-6 backdrop-blur-md sm:p-8">
          <div className="mx-auto max-w-xl">
            <div className="mb-3 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                <Search className="size-3.5" />
                Brave Search
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                go(query);
              }}
              className="flex gap-2"
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the open web…"
                aria-label="Search query"
                className="h-11 border-primary/30 bg-background/60 text-base focus-visible:ring-primary/40"
              />
              <Button
                type="submit"
                size="lg"
                className="glow-sm h-11 shrink-0 bg-primary px-5 text-primary-foreground hover:bg-primary/90"
              >
                <Search className="size-4" />
                <span className="hidden sm:inline">Search</span>
              </Button>
            </form>

            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              Results open in a new tab
              <ArrowUpRight className="size-3" />
              — unfiltered, untracked back to this site.
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => go(s)}
                  className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs text-primary/85 transition hover:border-primary/50 hover:bg-primary/15 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-primary/20 border-t border-primary/25 bg-[oklch(0.13_0.04_293_/_0.7)] text-center text-xs text-muted-foreground backdrop-blur-md">
          <div className="px-3 py-2.5">
            <span className="block font-semibold text-foreground/85">Encrypted</span>
            HTTPS to Brave
          </div>
          <div className="px-3 py-2.5">
            <span className="block font-semibold text-foreground/85">No logs</span>
            searches stay yours
          </div>
          <div className="px-3 py-2.5">
            <span className="block font-semibold text-foreground/85">Private</span>
            independent index
          </div>
        </div>
      </div>
    </section>
  );
}
