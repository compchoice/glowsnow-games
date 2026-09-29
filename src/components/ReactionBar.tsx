import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { REACTION_EMOJI, isReactionEmoji } from "@/lib/engagement";
import { cn } from "@/lib/utils";

type TargetType = "chat" | "lounge";

/**
 * The emoji row under a message. Reactions for the whole visible list are
 * fetched in one query and passed in as `reactions`, so scrolling a long chat
 * does not fire a query per row.
 */
export function ReactionBar({
  targetType,
  targetId,
  reactions,
  onReport,
}: {
  targetType: TargetType;
  targetId: string;
  reactions: { emoji: string; count: number; mine: boolean }[];
  onReport?: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const toggle = useMutation(api.reactions.toggle);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(
    () => reactions.filter((row) => isReactionEmoji(row.emoji)).slice(0, 4),
    [reactions],
  );

  async function react(emoji: string) {
    if (!isAuthenticated || busy) return;
    setBusy(true);
    try {
      await toggle({ targetType, targetId, emoji });
    } catch {
      // A failed tap is not worth interrupting the conversation for.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {shown.map((row) => (
        <button
          key={row.emoji}
          type="button"
          onClick={() => react(row.emoji)}
          disabled={!isAuthenticated || busy}
          title={`${row.emoji} ${row.count}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-60",
            row.mine
              ? "border-primary/40 bg-primary/15 text-foreground"
              : "border-border/70 bg-muted/40 text-muted-foreground hover:border-primary/30",
          )}
        >
          <span>{row.emoji}</span>
          <span className="tabular-nums">{row.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={!isAuthenticated}
          aria-label="Add a reaction"
          aria-expanded={open}
          className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border/70 bg-muted/40 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          +
        </button>
        {open && (
          <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-lg border border-border/70 bg-card p-1 shadow-lg">
            {REACTION_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  void react(emoji);
                  setOpen(false);
                }}
                className="rounded p-1 text-sm transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {onReport && (
        <button
          type="button"
          onClick={onReport}
          disabled={!isAuthenticated}
          className="ml-1 text-[11px] text-muted-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Report
        </button>
      )}
    </div>
  );
}
