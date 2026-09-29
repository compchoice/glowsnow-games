import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SHORTCUTS,
  displayTarget,
  proxyEndpoint,
  proxyUrl,
  resolveAddress,
} from "@/lib/proxy";
import { BRAVE_SEARCH_URL } from "@/lib/site";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  RotateCw,
  Search,
  X,
} from "lucide-react";

type Entry = { target: string; proxy: string };

const START_SEARCH = "https://search.brave.com/";

/** Turns free text into a history entry: an address, or a Brave search. */
function entryFor(input: string | undefined | null): Entry | null {
  const trimmed = input?.trim();
  if (!trimmed) return null;
  const resolved = resolveAddress(trimmed);
  const target =
    resolved.kind === "address"
      ? resolved.value
      : `${BRAVE_SEARCH_URL}${encodeURIComponent(resolved.value)}`;
  const wrapped = proxyUrl(target);
  return wrapped ? { target, proxy: wrapped } : null;
}

export function ProxyBrowser({ initialQuery }: { initialQuery?: string }) {
  const endpoint = proxyEndpoint();
  const initial = entryFor(initialQuery);

  const [entries, setEntries] = useState<Entry[]>(() =>
    initial ? [initial] : [],
  );
  const [index, setIndex] = useState(() => (initial ? 0 : -1));
  const [address, setAddress] = useState(() => initial?.target ?? "");
  const [loading, setLoading] = useState(() => Boolean(initial));
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const current = index >= 0 ? entries[index] : undefined;

  function go(rawTarget: string) {
    // Unwrap a pasted proxied link so it can't get wrapped twice.
    const target = displayTarget(rawTarget.trim());
    const wrapped = proxyUrl(target);
    if (!wrapped) return;
    setNotice(null);
    setLoading(true);
    const next = entries.slice(0, index + 1);
    next.push({ target, proxy: wrapped });
    setEntries(next);
    setIndex(next.length - 1);
    setAddress(target);
  }

  function openInBrowser(input: string) {
    const resolved = resolveAddress(input);
    if (resolved.kind === "address") {
      go(resolved.value);
    } else if (resolved.value) {
      go(`${BRAVE_SEARCH_URL}${encodeURIComponent(resolved.value)}`);
    }
  }

  function step(direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= entries.length) return;
    setIndex(next);
    setLoading(true);
    setNotice(null);
    setAddress(entries[next].target);
  }

  // The framed page reports proxy-level problems via postMessage.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "dex-proxy-message") {
        setNotice(
          String(event.data.message ?? "The proxy could not load that page."),
        );
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const canGoBack = index > 0;
  const canGoForward = index >= 0 && index < entries.length - 1;

  if (!endpoint) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
        The proxy backend isn&apos;t available to this deployment yet. Start the
        Convex dev process so <code>VITE_CONVEX_SITE_URL</code> is set, then
        reload the page.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60">
      {/* Toolbar */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          openInBrowser(address);
        }}
        className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5"
      >
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Back"
            disabled={!canGoBack}
            onClick={() => step(-1)}
            className="text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Forward"
            disabled={!canGoForward}
            onClick={() => step(1)}
            className="text-muted-foreground"
          >
            <ArrowRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Reload"
            disabled={!current}
            onClick={() => {
              setLoading(true);
              setNotice(null);
              setReloadKey((key) => key + 1);
            }}
            className="text-muted-foreground"
          >
            <RotateCw className="size-4" />
          </Button>
        </div>

        <div className="relative flex-1">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Type a web address or a search…"
            aria-label="Address"
            spellCheck={false}
            className="h-9 pr-8 pl-8 text-sm"
          />
          {address && (
            <button
              type="button"
              aria-label="Clear address"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setAddress("")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Button type="submit" size="sm" className="h-9 px-3">
          <Search className="size-3.5" />
          <span className="hidden sm:inline">Go</span>
        </Button>
      </form>

      {notice && (
        <div className="flex items-start gap-2 border-b border-border/70 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          {current && (
            <a
              href={current.target}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 underline"
            >
              open directly
            </a>
          )}
        </div>
      )}

      {/* Viewport */}
      <div className="relative h-[68vh] min-h-[26rem] w-full bg-muted/30">
        {current ? (
          <>
            {loading && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-background/85 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                <Loader2 className="size-3.5 animate-spin" />
                loading through the proxy…
              </div>
            )}
            <iframe
              key={`${current.proxy}-${reloadKey}`}
              src={current.proxy}
              title={`Proxied page: ${current.target}`}
              className="size-full border-0 bg-white"
              allow="autoplay; fullscreen; clipboard-read; clipboard-write"
              onLoad={() => setLoading(false)}
            />
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
            <span className="flex size-11 items-center justify-center rounded-full border border-border/70 bg-card text-primary">
              <Globe className="size-5" />
            </span>
            <div>
              <p className="font-medium">Proxy ready</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Enter an address above, or start with one of these. Pages load
                inside this frame, so the network only ever sees this site.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SHORTCUTS.map((shortcut) => (
                <button
                  key={shortcut.url}
                  type="button"
                  onClick={() => go(shortcut.url)}
                  className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {shortcut.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => go(START_SEARCH)}
                className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary"
              >
                Brave Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Lock className="size-3" />
          {current ? `proxied · ${displayTarget(current.target)}` : "nothing loaded yet"}
        </span>
        {current && (
          <span className="flex items-center gap-3">
            <a
              href={current.target}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <ExternalLink className="size-3" />
              open directly
            </a>
            <a
              href={current.proxy}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              proxied tab
            </a>
          </span>
        )}
      </div>
    </div>
  );
}
