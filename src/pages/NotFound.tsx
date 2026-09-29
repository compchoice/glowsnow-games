import { Link } from "react-router";
import { PageShell } from "@/components/Layout";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell>
      <div className="py-16">
        <Eyebrow>Error 404</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          That page has drifted off
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          The link you followed doesn&apos;t exist on Dex:Active. Head back to
          the arcade, the proxy, or the lounge — they all still work.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/games">Browse games</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
