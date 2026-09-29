import { useState } from "react";
import { Button } from "@/components/ui/button";
import { proxyUrl } from "@/lib/proxy";
import type { CatalogGame } from "@/lib/catalog";
import { ExternalLink, Maximize2, RotateCcw, Shield, ShieldOff } from "lucide-react";

/** Plays a catalog game inside the page, directly or through the proxy. */
export function GamePlayer({ game }: { game: CatalogGame }) {
  const [embedKey, setEmbedKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const [viaProxy, setViaProxy] = useState(false);

  // Some hosts (kdata1, Newgrounds) refuse server-side fetches, so a game can
  // name a mirror that is only used in proxy mode.
  const proxiedUrl = proxyUrl(game.proxyUrl ?? game.embedUrl);
  const canProxy = proxiedUrl !== null;
  const src = viaProxy && proxiedUrl ? proxiedUrl : game.embedUrl;
  const externalUrl = viaProxy && proxiedUrl ? proxiedUrl : game.playUrl;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60">
      <div className="aspect-video w-full bg-muted/40">
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
                    setViaProxy(true);
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {viaProxy
            ? "Playing through the proxy — slower, but reachable from filtered networks."
            : failed
              ? "Frame unavailable"
              : "Click the frame, then use the arrow keys or your mouse."}
        </p>
        <div className="flex flex-wrap gap-2">
          {canProxy && !failed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViaProxy((enabled) => !enabled);
                setEmbedKey((key) => key + 1);
              }}
              className={viaProxy ? "border-primary/40 text-primary" : undefined}
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
