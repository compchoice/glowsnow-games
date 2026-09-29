import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { ConfirmDialog } from "@/components/ConfirmAction";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Save/unsave a game. Rendered as a plain button (never an anchor) so it can sit
 * inside the game card's link without nesting anchors.
 */
export function FavoriteButton({
  slug,
  title,
  showLabel = false,
  confirmRemove = false,
  className,
}: {
  slug: string;
  /** Game name, used in the confirmation copy. Falls back to the slug. */
  title?: string;
  showLabel?: boolean;
  /**
   * Ask before unsaving. Only worth it where the game disappears when it is
   * unsaved — on the shelf, not on the catalog or a game page where the heart is
   * just a toggle.
   */
  confirmRemove?: boolean;
  className?: string;
}) {
  const { isAuthenticated } = useAuth();
  const { slugs, toggle } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (confirmRemove && active) {
      setConfirmOpen(true);
      return;
    }
    void save();
  }

  const button = (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-haspopup={confirmRemove ? "dialog" : undefined}
      aria-expanded={confirmRemove ? confirmOpen : undefined}
      aria-label={
        active
          ? `Remove ${confirmRemove ? label : "this game"} from your shelf`
          : "Save to your shelf"
      }
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

  if (!confirmRemove) return button;

  return (
    <>
      {button}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove ${label} from your shelf?`}
        description="It stays in the catalog — you can save it again any time."
        confirmLabel="Remove"
        onConfirm={save}
      />
    </>
  );
}
