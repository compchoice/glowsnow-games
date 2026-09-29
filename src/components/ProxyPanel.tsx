import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";

const SUGGESTIONS = [
  "friday night funkin mods",
  "wikipedia black holes",
  "cool math puzzles",
  "how to beat week 7",
];

/**
 * The quick search on the landing page. Whatever is typed is handed to the
 * in-page proxy browser on /proxy — no new tabs, no results page.
 */
export function ProxyPanel({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      navigate("/proxy");
      return;
    }
    navigate(`/proxy?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60">
      <div className={compact ? "p-5" : "p-6 sm:p-8"}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(query);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the web, or paste an address…"
            aria-label="Search or address"
            className="h-11 text-base"
          />
          <Button type="submit" size="lg" className="h-11 shrink-0 px-5">
            <Search className="size-4" />
            Go
          </Button>
        </form>

        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3" />
          Opens in the proxy browser, inside Dex:Active
          <ArrowRight className="size-3" />
          and you can open any page directly if you prefer.
        </p>

        {!compact && (
          <div className="mt-5 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => submit(suggestion)}
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
            ["Rewritten on the server", "Links and assets point back here"],
            ["No logs", "Your queries stay yours"],
            ["Works for games too", "Flip any game to proxy mode"],
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
