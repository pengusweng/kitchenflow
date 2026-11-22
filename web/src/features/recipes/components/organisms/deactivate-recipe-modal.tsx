"use client";

import { Ban, CircleAlert, LoaderCircle } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RecipeUse } from "../../utils/recipes";

type DeactivateRecipeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeName: string;
  /** Menu items linked to the recipe now; named so the impact is clear before confirming. */
  usedBy: RecipeUse[];
  onConfirm: () => void;
  /** While DELETE /recipes/:id is in flight: the dialog stays open and can't be dismissed. */
  pending: boolean;
  /** Why the last attempt failed. */
  error: string | null;
  /** Where focus goes once the dialog closes, since the button that opened it may be gone. */
  finalFocus: () => HTMLElement | null;
};

// DESIGN.md › Elevation: dialogs get Shadow 3; dark mode swaps it for a hairline edge.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";
const ACTION = "h-10 px-4 font-semibold";
const SHOWN_ITEMS = 3;

export default function DeactivateRecipeModal({
  open,
  onOpenChange,
  recipeName,
  usedBy,
  onConfirm,
  pending,
  error,
  finalFocus,
}: DeactivateRecipeModalProps) {
  // Keep is the safe default, so it takes focus first.
  const keepRef = useRef<HTMLButtonElement>(null);
  const shown = usedBy.slice(0, SHOWN_ITEMS);
  const more = usedBy.length - shown.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        initialFocus={keepRef}
        finalFocus={() => finalFocus() ?? true}
        className={`gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-md ${SURFACE}`}
      >
        <DialogHeader className="gap-2 px-6 pt-5 pb-4">
          <DialogTitle className="text-base font-semibold text-pretty text-ink">Deactivate {recipeName}?</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-ink-muted">
            No menu item can be linked to it while it&apos;s inactive, and it can&apos;t be edited. You can reactivate
            it later.
          </DialogDescription>
        </DialogHeader>

        {usedBy.length > 0 ? (
          <div className="mx-6 mb-5 rounded-lg bg-surface-hover px-3 py-2.5 text-sm leading-5">
            <p className="font-semibold text-ink">
              {usedBy.length === 1 ? "1 menu item uses it now" : `${usedBy.length} menu items use it now`}
            </p>
            <ul className="mt-1 grid gap-0.5 text-ink-muted">
              {shown.map((item) => (
                <li key={item.id} className="truncate">
                  {item.name}
                </li>
              ))}
              {more > 0 ? <li>and {more} more</li> : null}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mx-6 mb-5 flex items-start gap-2 text-sm leading-5 text-danger-ink dark:text-destructive"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <DialogFooter className="mx-0 mb-0 border-hairline bg-transparent px-6 py-4">
          <DialogClose
            ref={keepRef}
            disabled={pending}
            render={<Button type="button" variant="outline" size="lg" className={ACTION} />}
          >
            Keep recipe
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className={ACTION}
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Ban aria-hidden="true" />}
            {pending ? "Deactivating…" : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
