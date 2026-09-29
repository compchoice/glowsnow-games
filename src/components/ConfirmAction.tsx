import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Matches the `destructive` button variant, for the confirm button. */
const DESTRUCTIVE_ACTION =
  "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40";

type ConfirmCopy = {
  /** Headline, phrased as the question being confirmed. */
  title: string;
  /** Says what the action does and does not touch. */
  description?: ReactNode;
  /** Label on the confirm button. */
  confirmLabel?: string;
  /** Label on the dismiss button. */
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
};

/** The header, copy and buttons shared by both confirm entry points. */
function ConfirmBody({
  title,
  description,
  confirmLabel = "Remove",
  cancelLabel = "Cancel",
  onConfirm,
}: ConfirmCopy) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description && (
          <AlertDialogDescription>{description}</AlertDialogDescription>
        )}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          className={DESTRUCTIVE_ACTION}
          onClick={() => void onConfirm()}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

/**
 * A confirmation opened by `trigger`. Use this wherever the control is a normal
 * button — Radix wires up the popup semantics (aria-haspopup, aria-expanded and
 * returning focus afterwards) for free.
 */
export function ConfirmButton({
  trigger,
  ...copy
}: ConfirmCopy & { trigger: ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <ConfirmBody {...copy} />
    </AlertDialog>
  );
}

/**
 * The same confirmation with no trigger: the caller owns `open` and opens it from
 * its own control. This exists for controls nested inside a link — a Radix
 * trigger there needs `preventDefault` to stop the navigation, and that makes
 * Radix skip its own open (its handler bails on a defaulted event).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  ...copy
}: ConfirmCopy & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <ConfirmBody {...copy} />
    </AlertDialog>
  );
}
