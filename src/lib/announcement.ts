/**
 * Announcement rules. Shared so the admin editor and the landing hero agree on
 * what counts as a valid announcement, and so a bad link can never reach the
 * database in the first place.
 */

/** The most an announcement may say. Long enough to be a sentence, not an essay. */
export const MAX_MESSAGE = 160;

/** Label on the announcement's call to action. */
export const MAX_LINK_LABEL = 40;

/**
 * Shown when the owner has not written one. Set to whatever the site actually
 * wants to say, so the hero is never blank.
 */
export const DEFAULT_ANNOUNCEMENT =
  "Granny, Granny 2 and Buckshot Roulette have landed in the arcade — plus six channels in chat and a leaderboard.";

export type Announcement = {
  message: string;
  /** Optional "Read more" style target. Internal paths only. */
  linkTo: string | null;
  linkLabel: string | null;
};

export type AnnouncementCheck =
  | { ok: true; announcement: Announcement }
  | { ok: false; error: string };

/**
 * A link is only allowed to point somewhere inside the site. This blocks
 * `javascript:` and any other scheme, which would otherwise be a stored XSS
 * vector once the message renders as a real link.
 */
export function isSafeLink(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  // Must start with a single slash, and must not be a protocol-relative "//".
  return text.startsWith("/") && !text.startsWith("//");
}

export function checkAnnouncement(
  message: string,
  linkTo: string,
  linkLabel: string,
): AnnouncementCheck {
  const text = message.trim();
  if (!text) return { ok: false, error: "Write the announcement first." };
  if (text.length > MAX_MESSAGE) {
    return { ok: false, error: `Keep it under ${MAX_MESSAGE} characters.` };
  }

  const target = linkTo.trim();
  const label = linkLabel.trim();

  if (target && !isSafeLink(target)) {
    return {
      ok: false,
      error: "The link has to be a page on this site, like /games.",
    };
  }
  if (target && !label) {
    return { ok: false, error: "Give the link a label, or clear the link." };
  }
  if (label && !target) {
    return { ok: false, error: "A link label needs a link to point at." };
  }
  if (label.length > MAX_LINK_LABEL) {
    return { ok: false, error: "That link label is too long." };
  }

  return {
    ok: true,
    announcement: {
      message: text,
      linkTo: target || null,
      linkLabel: target ? label : null,
    },
  };
}

/** What the hero shows: the live announcement, or the built-in one. */
export function announcementToShow(
  stored:
    | { message: string; linkTo?: string | null; linkLabel?: string | null }
    | null
    | undefined,
): Announcement {
  if (!stored || !stored.message.trim()) {
    return { message: DEFAULT_ANNOUNCEMENT, linkTo: null, linkLabel: null };
  }
  // Defensive: a row written before a rule changed should not render a link
  // the site has since decided is unsafe.
  const linkTo = stored.linkTo && isSafeLink(stored.linkTo) ? stored.linkTo : null;
  return {
    message: stored.message.trim(),
    linkTo,
    linkLabel: linkTo ? (stored.linkLabel ?? null) : null,
  };
}
