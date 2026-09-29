import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, EyeOff, RotateCcw, Settings, Snowflake } from "lucide-react";
import { useDevTools } from "@/lib/dev-store";
import { setCloak } from "@/lib/cloak";
import { TAB_PRESETS } from "@/lib/site";
import {
  ACCENTS,
  FONTS,
  WALLPAPERS,
  accentSwatch,
  isValidWallpaperUrl,
  themeStore,
  useTheme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Every personal preference in one place. All of it is client-side: the choices
 * are written to this browser's localStorage and applied to the document root,
 * so nothing is stored on an account and nobody else's view is affected.
 */
export function SettingsMenu() {
  const [theme, setTheme] = useTheme();
  const [devState] = useDevTools();
  const [open, setOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState(theme.wallpaperUrl);
  const [urlError, setUrlError] = useState<string | null>(null);

  function commitUrl(value: string) {
    setUrlDraft(value);
    if (value.trim() === "" || isValidWallpaperUrl(value)) {
      setUrlError(null);
      themeStore.set({ wallpaperUrl: value.trim() });
    } else {
      setUrlError("Use an http(s) link or a path starting with /.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="border-border/70 text-muted-foreground hover:text-foreground"
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Saved in this browser only. Nobody else sees these choices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode */}
          <section className="space-y-2">
            <Label>Appearance</Label>
            <div className="flex gap-2">
              {(["dark", "light"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme({ mode })}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors",
                    theme.mode === mode
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          {/* Accent */}
          <section className="space-y-2">
            <Label>Accent</Label>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((accent) => (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => setTheme({ accent: accent.id })}
                  aria-label={accent.label}
                  aria-pressed={theme.accent === accent.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                    theme.accent === accent.id
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className="size-3.5 rounded-full"
                    style={{ backgroundColor: accentSwatch(accent) }}
                    aria-hidden
                  />
                  {accent.label}
                  {theme.accent === accent.id && (
                    <Check className="size-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Font */}
          <section className="space-y-2">
            <Label>Font</Label>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => setTheme({ font: font.id })}
                  aria-pressed={theme.font === font.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors",
                    theme.font === font.id
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/70 hover:border-primary/40",
                  )}
                >
                  <span className="block text-xs text-muted-foreground">
                    {font.label}
                  </span>
                  <span
                    className="block truncate text-sm"
                    style={{ fontFamily: font.stack }}
                  >
                    Play search talk
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Wallpaper */}
          <section className="space-y-2">
            <Label>Wallpaper</Label>
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPERS.map((wallpaper) => (
                <button
                  key={wallpaper.id}
                  type="button"
                  onClick={() => setTheme({ wallpaper: wallpaper.id })}
                  aria-pressed={theme.wallpaper === wallpaper.id}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-center transition-colors",
                    theme.wallpaper === wallpaper.id
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/70 hover:border-primary/40",
                  )}
                >
                  <span className="block text-xs font-medium">
                    {wallpaper.label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {wallpaper.hint}
                  </span>
                </button>
              ))}
            </div>

            {theme.wallpaper === "custom" && (
              <div className="space-y-1.5 pt-1">
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor="wallpaper-url"
                >
                  Picture URL
                </label>
                <Input
                  id="wallpaper-url"
                  value={urlDraft}
                  onChange={(event) => commitUrl(event.target.value)}
                  placeholder="https://…/wallpaper.jpg"
                  aria-invalid={urlError !== null}
                />
                {urlError && (
                  <p className="text-xs text-destructive">{urlError}</p>
                )}
              </div>
            )}
          </section>

          {/* Snow */}
          <section className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Snowflake className="size-4 text-primary" />
              <div>
                <Label htmlFor="snow-toggle">Snowfall</Label>
                <p className="text-xs text-muted-foreground">
                  Slow drifting droplets
                </p>
              </div>
            </div>
            <Switch
              id="snow-toggle"
              checked={theme.snow}
              onCheckedChange={(snow) => setTheme({ snow })}
            />
          </section>

          {/* Disguise */}
          <section className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <EyeOff className="size-3.5" />
              Show this tab as
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {TAB_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setCloak(preset)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                    devState.panicTab?.label === preset.label
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span aria-hidden>{preset.icon}</span> {preset.label}
                </button>
              ))}
              {devState.panicTab && (
                <button
                  type="button"
                  onClick={() => setCloak(null)}
                  className="rounded-lg border border-border/70 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Remove
                </button>
              )}
            </div>
          </section>

          <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
            <p className="text-xs text-muted-foreground">
              Escape still works as a quick disguise.
            </p>
            <Button variant="ghost" size="sm" onClick={() => themeStore.reset()}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
