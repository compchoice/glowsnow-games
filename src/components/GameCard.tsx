import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FNF_EMBED_URL, FNF_PLAY_URL } from "@/lib/site";
import { ExternalLink, RotateCcw } from "lucide-react";

/**
 * Version-1 Games section: Friday Night Funkin' in a playable frame.
 * If the mirror ever refuses to load, a fallback links out to it directly.
 */
export function GameCard() {
  const [embedKey, setEmbedKey] = useState(0);
  const [failed, setFailed] = useState(false);

  return (
    <section id="games" className="scroll-mt-24">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
            01 — Games
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            The Arcade Floor
          </h2>
        </div>
        <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary/90 sm:block">
          1 game · more soon
        </span>
      </header>

      <div className="relative overflow-hidden rounded-2xl ring-glow">
        <div className="aspect-video w-full bg-[oklch(0.12_0.04_293)]">
          {!failed ? (
            <iframe
              key={embedKey}
              src={FNF_EMBED_URL}
              title="Friday Night Funkin'"
              className="size-full border-0"
              allow="autoplay; fullscreen"
              loading="lazy"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                The game couldn&apos;t load inside the frame.
              </p>
              <Button asChild variant="outline" className="border-primary/40">
                <a href={FNF_PLAY_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open Friday Night Funkin&apos; directly
                </a>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/25 bg-card/70 px-4 py-3 backdrop-blur-md">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">
              Friday Night Funkin&apos;
            </h3>
            <p className="text-xs text-muted-foreground">
              Rhythm · Arrow keys / WASD · hit the beat, survive week after week
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary/30 hover:bg-primary/10 hover:text-primary"
              onClick={() => setEmbedKey((k) => k + 1)}
            >
              <RotateCcw className="size-3.5" />
              Restart
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-primary/30 hover:bg-primary/10 hover:text-primary"
            >
              <a href={FNF_PLAY_URL} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                Fullscreen
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
