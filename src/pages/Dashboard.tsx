import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { devStore, useDevTools } from "@/lib/dev-store";
import { DEV_COMMANDS } from "@/components/DevConsole";
import {
  Gamepad2,
  Globe,
  Snowflake,
  Terminal,
  LogOut,
  Command,
} from "lucide-react";
import { useNavigate, Link } from "react-router";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [state, setState] = useDevTools();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const cloakTarget = state.panicTab
    ? `${state.panicTab.label} — "${state.panicTab.title}"`
    : "No disguise active";

  return (
    <main className="relative z-[2] min-h-screen px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
              Owner workspace
            </p>
            <h1 className="glow-text mt-1 text-3xl font-bold tracking-tight">
              Welcome{user?.name ? `, ${user.name}` : ""}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              className="border-primary/30 hover:bg-primary/10 hover:text-primary"
            >
              <Link to="/">
                <Globe className="size-4" />
                View site
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-primary/30 hover:bg-primary/10 hover:text-primary"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </header>

        {/* Quick toggles */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-primary/25 bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-glow">
                  <Snowflake className="size-5" />
                </div>
                <CardTitle className="text-base">Snow droplets</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="min-h-5">
                {state.snow ? "Falling over the whole site." : "Currently switched off."}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-primary/30 hover:bg-primary/10 hover:text-primary"
                onClick={() => setState({ snow: !state.snow })}
              >
                {state.snow ? "Turn off" : "Turn on"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/25 bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-glow">
                  <Globe className="size-5" />
                </div>
                <CardTitle className="text-base">Panic cloak</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="min-h-5 truncate">{cloakTarget}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-primary/30 hover:bg-primary/10 hover:text-primary"
                onClick={() =>
                  setState({
                    panicTab: state.panicTab
                      ? null
                      : {
                          label: "Google Classroom",
                          icon: "📚",
                          title: "Classes",
                        },
                  })
                }
              >
                {state.panicTab ? "Uncloak" : "Cloak as Classroom"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/25 bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-glow">
                  <Terminal className="size-5" />
                </div>
                <CardTitle className="text-base">Dev console</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="min-h-5">Summon with Ctrl + `</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-primary/30 hover:bg-primary/10 hover:text-primary"
                onClick={() => setState({ ownerMode: true, devConsoleOpen: true })}
              >
                Open console
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Dev command reference */}
        <Card className="border-primary/25 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-glow">
                <Command className="size-5" />
              </div>
              <div>
                <CardTitle>Developer commands</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every command works in the bottom-left console.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="overflow-x-auto rounded-lg border border-primary/20">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-primary/10 text-primary">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Command</th>
                    <th className="px-3 py-2 font-semibold">What it does</th>
                    <th className="px-3 py-2 font-semibold">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/15">
                  {DEV_COMMANDS.map((spec) => (
                    <tr key={spec.cmd} className="text-foreground/85">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-primary">
                        {spec.cmd}
                        {spec.args ? ` ${spec.args}` : ""}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{spec.desc}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-foreground/70">
                        {spec.usage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* What's live in v1 */}
        <Card className="border-primary/25 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-glow">
                <Gamepad2 className="size-5" />
              </div>
              <div>
                <CardTitle>Version 1 — what&apos;s live</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Exactly the scope that was asked for — nothing more.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              <li className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium">
                  <Gamepad2 className="size-4 text-primary" /> Footer 1 — Games
                </span>
                <span className="mt-1 block text-muted-foreground">
                  Friday Night Funkin&apos; playable on the page.
                </span>
              </li>
              <li className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium">
                  <Globe className="size-4 text-primary" /> Footer 2 — Proxy
                </span>
                <span className="mt-1 block text-muted-foreground">
                  Brave search in a clean new tab, untracked.
                </span>
              </li>
              <li className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium">
                  <Terminal className="size-4 text-primary" /> Developer cmds
                </span>
                <span className="mt-1 block text-muted-foreground">
                  Bottom-left console: snow, cloak, status, clear, exit.
                </span>
              </li>
              <li className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <span className="flex items-center gap-2 font-medium">
                  <Snowflake className="size-4 text-primary" /> Purple glow + snow
                </span>
                <span className="mt-1 block text-muted-foreground">
                  Canvas snowfall across every screen.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
