import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Save/unsave a game. Rendered as a plain button (never an anchor) so it can sit
 * inside the game card's link without nesting anchors.
 *
 * Unsaving confirms with a toast rather than a dialog: it is a one-tap undo-able
 * thing, and a modal on every heart tap would be miserable. `undoable` is for
 * grids where the card disappears on unsave, so the removal needs saying out
 * loud.
 */
export function FavoriteButton({
  slug,
  title,
  showLabel = false,
  undoable = false,
  className,
}: {
  slug: string;
  /** Game name, used in the toast. Falls back to the slug. */
  title?: string;
  showLabel?: boolean;
  /** Announce a removal with an undo toast. */
  undoable?: boolean;
  className?: string;
}) {
  const { isAuthenticated } = useAuth();
  const { slugs, toggle } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);

  const active = slugs.has(slug);
  const label = title || slug;

  async function save() {
    if (pending) return;
    setPending(true);
    try {
      await toggle({ gameSlug: slug });
    } catch {
      /* the button just stays put if the toggle fails */
    } finally {
      setPending(false);
    }
  }

  async function unsave() {
    if (pending) return;
    setPending(true);
    try {
      await toggle({ gameSlug: slug });
      toast(`Removed ${label} from your shelf`, {
        action: { label: "Undo", onClick: () => void toggle({ gameSlug: slug }) },
      });
    } catch {
      /* nothing to undo if it never went through */
    } finally {
      setPending(false);
    }
  }

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    void (active && undoable ? unsave() : save());
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from your shelf` : "Save to your shelf"}
      title={active ? "Saved to your shelf" : "Save to your shelf"}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
        className,
      )}
    >
      <Heart className={cn("size-3.5", active && "fill-current")} />
      {showLabel && (active ? "Saved" : "Save")}
    </button>
  );
}
