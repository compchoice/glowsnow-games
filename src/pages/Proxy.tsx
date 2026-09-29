import { PageShell } from "@/components/Layout";
import { ProxyPanel } from "@/components/ProxyPanel";
import { Eyebrow } from "@/components/SiteChrome";
import { ShieldCheck, ExternalLink, EyeOff } from "lucide-react";

const NOTES = [
  {
    icon: ShieldCheck,
    title: "Results stay out of your history",
    body: "Every search opens on Brave in a brand-new tab, so the query never appears in this site's own pages.",
  },
  {
    icon: ExternalLink,
    title: "No sign-in required",
    body: "The proxy works for everyone — signed in or not. Only posting messages and commenting needs an account.",
  },
  {
    icon: EyeOff,
    title: "Disguise the tab",
    body: "Press Esc, or use the Disguise menu in the header, to make this tab look like schoolwork in about a second.",
  },
];

export default function Proxy() {
  return (
    <PageShell wide>
      <header>
        <Eyebrow>Section two</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Proxy</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A single search box pointed at Brave Search instead of the usual
          engines. Type what you need and it opens in a fresh tab with the
          results ready.
        </p>
      </header>

      <div className="mt-6">
        <ProxyPanel />
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
        <h2 className="text-base font-semibold">Getting the best results</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Be specific.</span>{" "}
            &ldquo;friday night funkin week 7 tips&rdquo; beats &ldquo;fnf&rdquo;.
          </li>
          <li>
            <span className="font-medium text-foreground">Add a site name</span>{" "}
            to jump straight to it, like &ldquo;wikipedia gravity&rdquo;.
          </li>
          <li>
            <span className="font-medium text-foreground">Keep it clean.</span>{" "}
            Avoid anything you would not want a teacher to see in a tab title.
          </li>
        </ul>
      </section>
    </PageShell>
  );
}
