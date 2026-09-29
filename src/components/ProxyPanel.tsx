import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAVE_SEARCH_URL } from "@/lib/site";
import { ArrowUpRight, Lock, Search } from "lucide-react";

const SUGGESTIONS = [
  "friday night funkin mods",
  "best browser games",
  "cool math puzzles",
  "how to beat week 7",
];

export function braveSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  window.open(
    `${BRAVE_SEARCH_URL}${encodeURIComponent(trimmed)}`,
    "_blank",
    "noopener",
  );
}

/**
 * The proxy search. Results open in a fresh tab, so no network filter can tie
 * the results page back to this site and Brave can never frame-break.
 */
export function ProxyPanel({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60">
      <div className={compact ? "p-5" : "p-6 sm:p-8"}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            braveSearch(query);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the open web…"
            aria-label="Search query"
            className="h-11 text-base"
          />
          <Button type="submit" size="lg" className="h-11 shrink-0 px-5">
            <Search className="size-4" />
            Search
          </Button>
        </form>

        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" />
          Searches open on Brave in a new tab
          <ArrowUpRight className="size-3" />
          nothing here is tracked back to your account.
        </p>

        {!compact && (
          <div className="mt-5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => braveSearch(suggestion)}
                className="rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {!compact && (
        <div className="grid grid-cols-1 divide-y divide-border/70 border-t border-border/70 text-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ["Encrypted", "HTTPS the whole way to Brave"],
            ["No logs", "Your queries stay yours"],
            ["Independent", "Brave's own search index"],
          ].map(([title, detail]) => (
            <div key={title} className="px-5 py-4">
              <p className="font-medium">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
