import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageShell } from "@/components/Layout";
import { Messages } from "@/components/Messages";
import { ConfirmButton } from "@/components/ConfirmAction";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_GAMES } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Download, Pencil, Plus, Shield, Trash2, X } from "lucide-react";

type RoleChoice = "admin" | "moderator" | "user" | "member";

type FormState = {
  slug: string;
  title: string;
  category: string;
  description: string;
  tags: string;
  embedUrl: string;
  playUrl: string;
  proxyUrl: string;
  featured: boolean;
};

const EMPTY_FORM: FormState = {
  slug: "",
  title: "",
  category: "Arcade",
  description: "",
  tags: "",
  embedUrl: "",
  playUrl: "",
  proxyUrl: "",
  featured: false,
};

function Notice({ text, tone }: { text: string; tone: "ok" | "error" }) {
  return (
    <p
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "ok"
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-destructive/30 bg-destructive/5 text-destructive",
      )}
    >
      {text}
    </p>
  );
}

export default function Admin() {
  const status = useQuery(api.users.adminStatus);
  const catalog = useQuery(api.games.list);
  const members = useQuery(api.users.list, status?.isAdmin ? {} : "skip");

  const upsert = useMutation(api.games.upsert);
  const removeGame = useMutation(api.games.remove);
  const importDefaults = useMutation(api.games.importDefaults);
  const setFeatured = useMutation(api.games.setFeatured);
  const setRole = useMutation(api.users.setRole);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  if (status === undefined) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </PageShell>
    );
  }

  if (!status.isAdmin) {
    return (
      <PageShell>
        <Eyebrow>Owner only</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          Admin access required
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          This area manages the catalog, messages and members. If you are the
          site owner and no one has claimed the seat yet, claim it from your
          dashboard.
        </p>
      </PageShell>
    );
  }

  async function handleSave() {
    setNotice(null);
    try {
      const result = await upsert({
        slug: form.slug || undefined,
        title: form.title,
        category: form.category,
        description: form.description,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        embedUrl: form.embedUrl,
        playUrl: form.playUrl || form.embedUrl,
        proxyUrl: form.proxyUrl || undefined,
        featured: form.featured,
      });
      setNotice({
        tone: "ok",
        text: result.created
          ? `Added “${form.title}” to the catalog.`
          : `Updated “${form.title}”.`,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save the game.",
      });
    }
  }

  async function handleImport() {
    setNotice(null);
    try {
      const result = await importDefaults({
        games: DEFAULT_GAMES.map((game) => ({
          slug: game.slug,
          title: game.title,
          category: game.category,
          description: game.description,
          tags: game.tags,
          embedUrl: game.embedUrl,
          playUrl: game.playUrl,
          proxyUrl: game.proxyUrl,
          featured: game.featured,
        })),
      });
      setNotice({
        tone: "ok",
        text: `Starter catalog imported — ${result.inserted} new, ${result.total} total.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }

  async function handleToggleFeatured(id: Id<"games">, featured: boolean) {
    setNotice(null);
    try {
      await setFeatured({ id, featured });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not update that game.",
      });
    }
  }

  async function handleDeleteGame(id: Id<"games">, title: string) {
    setNotice(null);
    try {
      await removeGame({ id });
      setNotice({ tone: "ok", text: `Removed “${title}” from the catalog.` });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not remove that game.",
      });
    }
  }

  async function handleSetRole(userId: Id<"users">, role: RoleChoice) {
    setNotice(null);
    try {
      await setRole({ userId, role });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not change that role.",
      });
    }
  }

  return (
    <PageShell wide>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Owner area</Eyebrow>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage the games catalog, moderate the lounge, and control who else
            has owner access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Download className="size-4" />
            Import starter catalog
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setForm(EMPTY_FORM);
              setShowForm((open) => !open);
            }}
          >
            {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
            {showForm ? "Cancel" : "Add a game"}
          </Button>
        </div>
      </header>

      {notice && (
        <div className="mt-4">
          <Notice text={notice.text} tone={notice.tone} />
        </div>
      )}

      {showForm && (
        <section className="mt-6 rounded-xl border border-border/70 bg-card/60 p-5">
          <h2 className="text-base font-semibold">
            {form.slug ? "Edit game" : "New game"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Title</span>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Slope"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Category</span>
              <Input
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                placeholder="Arcade"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Embed URL</span>
              <Input
                value={form.embedUrl}
                onChange={(event) =>
                  setForm({ ...form, embedUrl: event.target.value })
                }
                placeholder="https://example.com/game/"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">
                Play URL (optional — falls back to the embed URL)
              </span>
              <Input
                value={form.playUrl}
                onChange={(event) =>
                  setForm({ ...form, playUrl: event.target.value })
                }
                placeholder="https://example.com/game/"
              />
            </label>
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="text-muted-foreground">
                Proxy mirror URL (optional — used only in proxy mode, for hosts
                that block server-side fetches)
              </span>
              <Input
                value={form.proxyUrl}
                onChange={(event) =>
                  setForm({ ...form, proxyUrl: event.target.value })
                }
                placeholder="https://mirror.example.com/game/"
              />
            </label>
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="text-muted-foreground">
                Tags (comma separated)
              </span>
              <Input
                value={form.tags}
                onChange={(event) =>
                  setForm({ ...form, tags: event.target.value })
                }
                placeholder="endless, reflex, neon"
              />
            </label>
            <label className="space-y-1.5 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Description</span>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                rows={2}
                placeholder="One or two lines about the game."
              />
            </label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                checked={form.featured}
                onCheckedChange={(featured) => setForm({ ...form, featured })}
                id="featured"
              />
              <label htmlFor="featured" className="text-sm">
                Feature on the home page
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!form.title.trim() || !form.embedUrl.trim()}
            >
              {form.slug ? "Save changes" : "Add to catalog"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setForm(EMPTY_FORM);
                setShowForm(false);
              }}
            >
              Cancel
            </Button>
          </div>
          {form.slug && (
            <p className="mt-2 text-xs text-muted-foreground">
              Editing <code className="text-primary">{form.slug}</code> — the URL
              stays the same.
            </p>
          )}
        </section>
      )}

      {/* Catalog */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          Catalog in the database
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Built-in starter games always show on the site. Games listed here
          override them by slug and are the ones you can edit.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-border/70">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Game</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Category
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {(catalog ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Nothing in the database yet. Import the starter catalog or
                    add a game above.
                  </td>
                </tr>
              ) : (
                (catalog ?? []).map((game) => (
                  <tr key={game._id} className="bg-card/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{game.title}</div>
                      <div className="text-xs text-muted-foreground">
                        /games/{game.slug}
                        {game.featured ? " · featured" : ""}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {game.category}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void handleToggleFeatured(game._id, !game.featured)
                          }
                        >
                          {game.featured ? "Unfeature" : "Feature"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setForm({
                              slug: game.slug,
                              title: game.title,
                              category: game.category,
                              description: game.description,
                              tags: game.tags.join(", "),
                              embedUrl: game.embedUrl,
                              playUrl: game.playUrl,
                              proxyUrl: game.proxyUrl ?? "",
                              featured: game.featured,
                            });
                            setShowForm(true);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <ConfirmButton
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              aria-label={`Remove ${game.title} from the catalog`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                          title={`Remove “${game.title}” from the catalog?`}
                          description="It disappears from the games page straight away. Comments on it stay in the database."
                          confirmLabel="Remove game"
                          onConfirm={() => handleDeleteGame(game._id, game.title)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Moderation */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Lounge moderation
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You can pin or delete any message. Members can only delete their own.
        </p>
        <div className="mt-4">
          <Messages scope="community" />
        </div>
      </section>

      {/* Members */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Members</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Promote a trusted member to owner, or drop them back to member.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-border/70">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Member</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Email
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {(members ?? []).map((member) => (
                <tr key={member._id} className="bg-card/40">
                  <td className="px-4 py-3">
                    <span className="font-medium">
                      {member.name ?? "Unnamed member"}
                    </span>
                    {member.isAnonymous && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        guest
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {member.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {member.role === "admin" && (
                        <Shield className="size-4 text-primary" />
                      )}
                      <select
                        value={member.role}
                        onChange={(event) =>
                          void handleSetRole(
                            member._id as Id<"users">,
                            event.target.value as RoleChoice,
                          )
                        }
                        className="rounded-md border border-border/70 bg-background px-2 py-1 text-sm"
                      >
                        <option value="member">Member</option>
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Owner</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {(members ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}
