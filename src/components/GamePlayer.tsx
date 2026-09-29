import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { proxyUrl } from "@/lib/proxy";
import type { CatalogGame } from "@/lib/catalog";
import { ExternalLink, Maximize2, RotateCcw, Shield, ShieldOff, X } from "lucide-react";

/**
 * How long a direct frame gets to say hello before we hint that the host is
 * blocking us. A blocked or erroring cross-origin frame fires neither `load`
 * nor `error` reliably, so this is the only signal we get.
 */
const HINT_AFTER_MS = 12000;

/** Plays a catalog game inside the page, directly or through the proxy. */
export function GamePlayer({ game }: { game: CatalogGame }) {
  // Some hosts (kdata1, Newgrounds) refuse server-side fetches, so a game can
  // name a mirror that is only used in proxy mode.
  const proxiedUrl = proxyUrl(game.proxyUrl ?? game.embedUrl);
  const canProxy = proxiedUrl !== null;

  // Proxy by default. Plenty of hosts send X-Frame-Options or a CSP
  // frame-ancestors list that excludes us (play2048.co does), and a blocked
  // frame just renders the host's own error page with no way back.
  const [direct, setDirect] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);
  const [failed, setFailed] = useState(false);
  // Which frame the "still loading" hint belongs to, so swapping modes or
  // restarting retires the old hint without an effect to reset it.
  const [hintFor, setHintFor] = useState<string | null>(null);

  const viaProxy = canProxy && !direct;
  const src = viaProxy ? (proxiedUrl as string) : game.embedUrl;
  const externalUrl = viaProxy ? (proxiedUrl as string) : game.playUrl;

  const frameToken = `${embedKey}-${viaProxy ? "proxy" : "direct"}-${failed}`;
  const slowHint = hintFor === frameToken;

  useEffect(() => {
    if (viaProxy || failed) return;
    const timer = setTimeout(() => setHintFor(frameToken), HINT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [frameToken, viaProxy, failed]);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60">
      <div className="relative aspect-video w-full bg-muted/40">
        {!failed ? (
          <iframe
            key={`${embedKey}-${viaProxy ? "proxy" : "direct"}`}
            src={src}
            title={game.title}
            className="size-full border-0"
            allow="autoplay; fullscreen"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {game.title} could not load inside the frame — the host may block
              embedding.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {canProxy && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFailed(false);
                    setDirect(false);
                    setEmbedKey((key) => key + 1);
                  }}
                >
                  <Shield className="size-4" />
                  Try it through the proxy
                </Button>
              )}
              <Button asChild variant="outline">
                <a href={externalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open in a new tab
                </a>
              </Button>
            </div>
          </div>
        )}

        {slowHint && !failed && (
          <div className="absolute inset-x-3 bottom-3 flex items-start gap-3 rounded-lg border border-border/70 bg-card/95 p-3 shadow-lg backdrop-blur">
            <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
              Still nothing from this host. It may be refusing to be embedded —
              try the proxy, which reaches it for you.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {canProxy && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDirect(false);
                    setEmbedKey((key) => key + 1);
                  }}
                >
                  <Shield className="size-3.5" />
                  Use the proxy
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Dismiss"
                onClick={() => setHintFor(null)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {failed
            ? "Frame unavailable"
            : viaProxy
              ? "Playing through the proxy — slower, but reachable from filtered networks."
              : "Playing direct. If the frame stays blank, switch to the proxy."}
        </p>
        <div className="flex flex-wrap gap-2">
          {canProxy && !failed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDirect((wasDirect) => !wasDirect);
                setEmbedKey((key) => key + 1);
              }}
              className={!viaProxy ? "border-primary/40 text-primary" : undefined}
            >
              {viaProxy ? (
                <ShieldOff className="size-3.5" />
              ) : (
                <Shield className="size-3.5" />
              )}
              {viaProxy ? "Play direct" : "Play via proxy"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFailed(false);
              setEmbedKey((key) => key + 1);
            }}
          >
            <RotateCcw className="size-3.5" />
            Restart
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const frame = document.querySelector<HTMLIFrameElement>(
                `iframe[title="${game.title}"]`,
              );
              frame?.requestFullscreen?.().catch(() => undefined);
            }}
          >
            <Maximize2 className="size-3.5" />
            Fullscreen
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={externalUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              New tab
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
