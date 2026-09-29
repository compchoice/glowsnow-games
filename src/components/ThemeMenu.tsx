import { ACCENTS, accentById, accentSwatch, useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accent colour + light/dark switch, available to every visitor. */
export function ThemeMenu() {
  const [theme, setTheme] = useTheme();
  const active = accentById(theme.accent);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border/70 bg-card/60 text-muted-foreground hover:text-foreground"
          aria-label="Customize the theme"
        >
          <Palette className="size-4" />
          <span className="hidden lg:inline">{active.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Accent colour
        </DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-2 px-2 pt-1 pb-2">
          {ACCENTS.map((accent) => (
            <button
              key={accent.id}
              type="button"
              onClick={() => setTheme({ accent: accent.id })}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] transition-colors",
                theme.accent === accent.id
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
              aria-pressed={theme.accent === accent.id}
            >
              <span
                className="size-5 rounded-full border border-black/10"
                style={{ backgroundColor: accentSwatch(accent) }}
              />
              {accent.label}
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        {([
          ["dark", "Dark", Moon],
          ["light", "Light", Sun],
        ] as const).map(([mode, label, Icon]) => (
          <DropdownMenuItem
            key={mode}
            onClick={() => setTheme({ mode })}
            className="gap-2"
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {theme.mode === mode && <Check className="size-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
