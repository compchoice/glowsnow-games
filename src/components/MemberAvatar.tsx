import { hueFromSeed, initialsOf } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-7 text-[11px]",
  md: "size-8 text-xs",
  lg: "size-12 text-lg",
  xl: "size-20 text-4xl",
};

/**
 * The avatar shown next to a message, chat line or profile header. Members pick
 * an emoji; everyone else gets initials on a colour derived from their id.
 */
export function MemberAvatar({
  name,
  avatar,
  seed,
  size = "md",
  className,
}: {
  name: string;
  avatar?: string | null;
  /** Stable id used for the fallback colour; falls back to the name. */
  seed?: string;
  size?: Size;
  className?: string;
}) {
  const hue = hueFromSeed(seed ?? name);
  const emoji = avatar?.trim();

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border font-medium text-foreground/85 select-none",
        SIZES[size],
        className,
      )}
      style={{
        backgroundColor: `oklch(0.6 0.14 ${hue} / 0.22)`,
        borderColor: `oklch(0.6 0.14 ${hue} / 0.38)`,
      }}
    >
      {emoji ? <span>{emoji}</span> : initialsOf(name)}
    </span>
  );
}
