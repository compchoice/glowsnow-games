import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { announcementToShow } from "@/lib/announcement";
import { Megaphone } from "lucide-react";

/**
 * The landing hero's headline is the site's announcement, not a fixed slogan,
 * so the owner can tell visitors what is going on. It stays the page's one `h1`
 * so the page keeps a single, meaningful top-level heading.
 */
export function AnnouncementHero() {
  const stored = useQuery(api.announcements.current);
  const notice = announcementToShow(stored);

  return (
    <div className="mt-4">
      <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-primary">
        <Megaphone className="size-3" />
        Announcement
      </p>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl">
        {notice.message}
        {notice.linkTo && notice.linkLabel && (
          <Link
            to={notice.linkTo}
            className="ml-2 inline-block whitespace-nowrap text-primary underline-offset-4 hover:underline"
          >
            {notice.linkLabel} →
          </Link>
        )}
      </h1>
    </div>
  );
}
