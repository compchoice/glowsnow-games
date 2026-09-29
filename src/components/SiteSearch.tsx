import { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { normalizeQuery } from "@/lib/engagement";
import { Search, X } from "lucide-react";

const KIND_LABEL: Record<string, string> = {
  game: "Game",
  member: "Member",
  request: "Idea",
  thread: "Thread",
  poll: "Poll",
};

/**
 * One search box for the whole site. A single character is not sent to the
 * server, so typing does not fire a query per keystroke against the database.
 */
export function SiteSearch() {
  const [term, setTerm] = useState("");
  const ready = normalizeQuery(term);
  const results = useQuery(api.search.all, ready ? { query: ready } : "skip");

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search games, people, ideas…"
        aria-label="Search the site"
        className="w-full rounded-lg border border-border/70 bg-background/60 py-2 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
      />
      {term && (
        <button
          type="button"
          onClick={() => setTerm("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}

      {ready && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border/70 bg-card p-1 shadow-xl">
          {(results?.hits ?? []).length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Nothing matched “{ready}”.
            </p>
          ) : (
            <ul>
              {(results?.hits ?? []).map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <Link
                    to={hit.href}
                    onClick={() => setTerm("")}
                    className="flex items-baseline gap-2 rounded-md px-3 py-2 transition-colors hover:bg-muted/60"
                  >
                    <span className="shrink-0 rounded border border-border/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {KIND_LABEL[hit.kind] ?? hit.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {hit.title}
                      </span>
                      {hit.detail && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {hit.detail}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
