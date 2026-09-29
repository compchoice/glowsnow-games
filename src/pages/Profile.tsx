import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageShell } from "@/components/Layout";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ModerationActions } from "@/components/ModerationActions";
import { FriendButton } from "@/components/FriendButton";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AVATAR_EMOJI } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { Check, Crown, MessageSquare, Pencil, Shield } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  admin: "Owner",
  moderator: "Moderator",
  user: "User",
  member: "Member",
};

function joinedLabel(timestamp: number) {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "recently";
  }
}

function timeAgo(timestamp: number) {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "just now";
  }
}

export default function Profile() {
  const { userId = "" } = useParams();
  // The query normalises whatever is in the URL, so a malformed id simply
  // reads as "member not found" instead of erroring the whole page.
  const profile = useQuery(api.profiles.get, userId ? { userId } : "skip");

  if (!userId || profile === null) {
    return (
      <PageShell>
        <Eyebrow>Not found</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          That member doesn&apos;t exist
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The profile may have been removed. Head back to the lounge to find
          everyone else.
        </p>
        <Button asChild className="mt-5">
          <Link to="/community">Open the lounge</Link>
        </Button>
      </PageShell>
    );
  }

  if (profile === undefined) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </PageShell>
    );
  }

  const stats: [string, number][] = [
    ["Messages", profile.stats.posts],
    ["Replies", profile.stats.replies],
    ["Chat lines", profile.stats.chat],
    ["Saved games", profile.stats.favorites],
    ["Playlists", profile.stats.playlists],
  ];

  return (
    <PageShell wide>
      <header className="flex flex-wrap items-start gap-5">
        <MemberAvatar
          name={profile.name}
          avatar={profile.avatar}
          seed={profile._id}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <Eyebrow>Member profile</Eyebrow>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-semibold tracking-tight">
              {profile.name}
            </h1>
            {profile.role === "admin" && (
              <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <Crown className="size-3" />
                Owner
              </span>
            )}
            {profile.role === "moderator" && (
              <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <Shield className="size-3" />
                Moderator
              </span>
            )}
            {profile.isAnonymous && (
              <span className="rounded-full border border-border/70 px-2.5 py-0.5 text-xs text-muted-foreground">
                Guest
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {ROLE_LABEL[profile.role] ?? "Member"} · joined{" "}
            {joinedLabel(profile.joinedAt)}
            {profile.email ? ` · ${profile.email}` : ""}
          </p>
          <p className="mt-3 max-w-2xl text-sm text-foreground/90">
            {profile.bio || (
              <span className="text-muted-foreground">
                {profile.isSelf
                  ? "Add a short bio so people know who they're talking to."
                  : "This member hasn't written a bio yet."}
              </span>
            )}
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-2">
            {profile.isSelf && (
              <Button asChild variant="outline" size="sm">
                <Link to="/shelf">
                  <Check className="size-4" />
                  My shelf
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/community">
                <MessageSquare className="size-4" />
                {profile.isSelf ? "Go to the lounge" : "Message them in the lounge"}
              </Link>
            </Button>
            <FriendButton userId={profile._id} name={profile.name} />
          </div>
        </div>
      </header>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border/70 bg-card/60 px-5 py-4"
          >
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Lounge &amp; comments
              </p>
              {profile.recentMessages.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing posted yet.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border/70">
                  {profile.recentMessages.map((message) => (
                    <li key={message._id} className="py-3 first:pt-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {message.isReply ? "Reply" : "Message"} ·{" "}
                          {timeAgo(message.createdAt)}
                        </span>
                        {message.gameSlug && (
                          <Link
                            to={`/games/${message.gameSlug}`}
                            className="text-primary hover:underline"
                          >
                            {message.gameSlug}
                          </Link>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm">
                        {message.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Chat
              </p>
              {profile.recentChat.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Hasn&apos;t said anything in the room yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {profile.recentChat.map((message) => (
                    <li key={message._id} className="text-sm">
                      <span className="text-muted-foreground">
                        {timeAgo(message.createdAt)} ·{" "}
                      </span>
                      <span className="text-foreground/90">{message.body}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {profile.isSelf && <ProfileEditor profile={profile} />}
      </div>

      {!profile.isSelf && (
        <ModerationActions userId={profile._id} name={profile.name} />
      )}
    </PageShell>
  );
}

function ProfileEditor({
  profile,
}: {
  profile: {
    name: string;
    bio: string | null;
    avatar: string | null;
    _id: Id<"users">;
  };
}) {
  const update = useMutation(api.profiles.update);
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatar, setAvatar] = useState(profile.avatar ?? "");
  const [notice, setNotice] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    try {
      await update({ name, bio, avatar });
      setNotice({ tone: "ok", text: "Profile updated." });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save that.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border/70 bg-card/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Pencil className="size-4 text-primary" />
          Edit your profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <MemberAvatar
            name={name || profile.name}
            avatar={avatar}
            seed={profile._id}
            size="lg"
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="profile-name">
              Display name
            </label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              placeholder="Your name"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Avatar</span>
          <div className="flex flex-wrap gap-1.5">
            {AVATAR_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`Use ${emoji} as your avatar`}
                aria-pressed={avatar === emoji}
                onClick={() => setAvatar(avatar === emoji ? "" : emoji)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border text-lg transition-colors",
                  avatar === emoji
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/70 hover:border-primary/40",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAvatar("")}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Use my initials instead
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="profile-bio">
            Bio
          </label>
          <Textarea
            id="profile-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
            maxLength={200}
            placeholder="A line or two about what you play."
            className="resize-none"
          />
          <p className="text-right text-xs text-muted-foreground">
            {bio.length}/200
          </p>
        </div>

        {notice && (
          <p
            className={cn(
              "flex items-center gap-1.5 text-sm",
              notice.tone === "ok" ? "text-primary" : "text-destructive",
            )}
          >
            {notice.tone === "ok" && <Check className="size-3.5" />}
            {notice.text}
          </p>
        )}

        <Button
          size="sm"
          className="w-full"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
