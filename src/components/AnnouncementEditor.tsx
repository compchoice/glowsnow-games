import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_LINK_LABEL,
  MAX_MESSAGE,
  checkAnnouncement,
} from "@/lib/announcement";
import { Loader2, Megaphone, X } from "lucide-react";

/**
 * Lets the owner write the announcement that replaces the landing hero
 * headline. Validation runs through the same helper the hero reads, so what
 * the owner is told here is exactly what will be enforced on save.
 */
export function AnnouncementEditor() {
  const stored = useQuery(api.announcements.current);
  const set = useMutation(api.announcements.set);
  const clear = useMutation(api.announcements.clear);

  const [message, setMessage] = useState("");
  const [linkTo, setLinkTo] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const live = stored ?? null;

  async function submit() {
    const check = checkAnnouncement(message, linkTo, linkLabel);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await set({
        message,
        linkTo: check.announcement.linkTo ?? undefined,
        linkLabel: check.announcement.linkLabel ?? undefined,
      });
      setMessage("");
      setLinkTo("");
      setLinkLabel("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  function editCurrent() {
    setMessage(live?.message ?? "");
    setLinkTo(live?.linkTo ?? "");
    setLinkLabel(live?.linkLabel ?? "");
    setError(null);
  }

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Megaphone className="size-5" />
        Announcement
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
        This is the big message at the top of the home page. Clear it and the page
        falls back to a built-in message, so the hero is never blank.
      </p>

      {live && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/8 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Live now
          </p>
          <p className="mt-1.5 text-sm">{live.message}</p>
          {live.linkTo && live.linkLabel && (
            <p className="mt-1 text-xs text-muted-foreground">
              Links to {live.linkTo} as “{live.linkLabel}”
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={editCurrent}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void clear({}).catch(() => undefined)}
            >
              <X className="size-3.5" />
              Take it down
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3 rounded-xl border border-border/70 bg-card/60 p-4">
        <div className="space-y-1.5">
          <label htmlFor="announcement-message" className="text-sm font-medium">
            Message
          </label>
          <Textarea
            id="announcement-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={2}
            maxLength={MAX_MESSAGE}
            placeholder="Granny and Granny 2 are in the arcade."
          />
          <p className="text-xs text-muted-foreground">
            {message.length}/{MAX_MESSAGE}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="announcement-link" className="text-sm font-medium">
              Link (optional)
            </label>
            <Input
              id="announcement-link"
              value={linkTo}
              onChange={(event) => setLinkTo(event.target.value)}
              placeholder="/games"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="announcement-label" className="text-sm font-medium">
              Link label (optional)
            </label>
            <Input
              id="announcement-label"
              value={linkLabel}
              onChange={(event) => setLinkLabel(event.target.value)}
              maxLength={MAX_LINK_LABEL}
              placeholder="Play now"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Links have to be a page on this site, like /games.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-primary">Announcement is live.</p>
        )}

        <Button onClick={submit} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {live ? "Replace announcement" : "Post announcement"}
        </Button>
      </div>
    </section>
  );
}
