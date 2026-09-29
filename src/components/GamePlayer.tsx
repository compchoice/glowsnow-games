import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CatalogGame } from "@/lib/catalog";
import { ExternalLink, Maximize2, RotateCcw } from "lucide-react";

/** Plays a catalog game inside the page, with escapes if a mirror blocks framing. */
export function GamePlayer({ game }: { game: CatalogGame }) {
  const [embedKey, setEmbedKey] = useState(0);
  const [failed, setFailed] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/60">
      <div className="aspect-video w-full bg-muted/40">
        {!failed ? (
          <iframe
            key={embedKey}
            src={game.embedUrl}
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
            <Button asChild variant="outline">
              <a href={game.playUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Open it in a new tab
              </a>
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {failed
            ? "Frame unavailable"
            : "Click the frame, then use the arrow keys or your mouse."}
        </p>
        <div className="flex gap-2">
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
            <a href={game.playUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" />
              New tab
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
