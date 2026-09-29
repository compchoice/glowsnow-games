import { useSearchParams } from "react-router";
import { PageShell } from "@/components/Layout";
import { ProxyBrowser } from "@/components/ProxyBrowser";
import { Eyebrow } from "@/components/SiteChrome";
import { BRAVE_SEARCH_URL } from "@/lib/site";
import { ExternalLink, EyeOff, ShieldCheck, Wifi } from "lucide-react";

const NOTES = [
  {
    icon: ShieldCheck,
    title: "Pages load through this site",
    body: "The browser fetches each page on the server and rewrites its links, so the network only ever sees this deployment — never the site you're visiting.",
  },
  {
    icon: Wifi,
    title: "Frames, scripts and styles still work",
    body: "Links, images, stylesheets, fetch calls and form posts are all routed back through the proxy automatically.",
  },
  {
    icon: EyeOff,
    title: "Disguise the tab",
    body: "Press Esc, or use the Disguise menu in the header, to make this tab look like schoolwork in about a second.",
  },
];

export default function Proxy() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";

  return (
    <PageShell wide>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Section two</Eyebrow>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Proxy</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Type an address to browse it inside Dex:Active, or type words to
            search Brave. Nothing here opens a new tab unless you ask it to.
          </p>
        </div>
        <a
          href={BRAVE_SEARCH_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
          Open Brave Search directly
        </a>
      </header>

      <div className="mt-6">
        <ProxyBrowser initialQuery={query} />
      </div>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {NOTES.map((note) => (
          <div
            key={note.title}
            className="rounded-xl border border-border/70 bg-card/60 p-5"
          >
            <note.icon className="size-5 text-primary" />
            <h2 className="mt-3 text-base font-semibold">{note.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{note.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-xl border border-border/70 bg-card/60 p-6">
        <h2 className="text-base font-semibold">What to expect</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Simple sites work best.</span>{" "}
            Wikis, docs, articles, static games and search results all load
            normally.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Big apps may not.
            </span>{" "}
            Sites that require a sign-in, open WebSockets, or build their own
            routing sometimes refuse to cooperate. When that happens, use{" "}
            <span className="font-medium text-foreground">open directly</span> in
            the status bar.
          </li>
          <li>
            <span className="font-medium text-foreground">
              Uploads and downloads are limited
            </span>{" "}
            to keep the proxy light — files over 10 MB are refused.
          </li>
          <li>
            <span className="font-medium text-foreground">Games too.</span> Every
            game page has a{" "}
            <span className="font-medium text-foreground">Play via proxy</span>{" "}
            toggle for when a game host is unreachable.
          </li>
        </ul>
      </section>
    </PageShell>
  );
}
