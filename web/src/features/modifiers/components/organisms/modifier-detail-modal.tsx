"use client";

import { Archive, Ban, Pencil, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DetailRow from "@/src/components/ui/molecules/detail-row";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import {
  formatDate,
  itemCount,
  type Modifier,
  type ModifierUse,
} from "../../utils/modifiers";
import UsedOnList from "../molecules/used-on-list";

type ModifierDetailModalProps = {
  modifier: Modifier | null;
  /** The menu items offering it; undefined while they load. */
  uses: ModifierUse[] | undefined;
  usesError?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: MenuBrand[];
  onEdit?: (modifier: Modifier) => void;
  onDeactivate?: (modifier: Modifier) => void;
  onReactivate?: (modifier: Modifier) => void;
  /** A deactivate or reactivate is in flight. */
  pending?: boolean;
  /** Why the last deactivate or reactivate failed. */
  actionError?: string;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

const ACTION = "h-10 cursor-pointer px-4 font-semibold";

// What deactivating takes away, said in terms of the counter.
function deactivateConsequence(modifier: Modifier) {
  const used = modifier.useCount;
  if (used === 0)
    return "It won't be offered on any item. You can reactivate it later.";
  return `Counters stop offering it on the ${itemCount(used)} that have it. You can reactivate it later.`;
}

export default function ModifierDetailModal({
  modifier,
  uses,
  usesError,
  open,
  onOpenChange,
  brands,
  onEdit,
  onDeactivate,
  onReactivate,
  pending = false,
  actionError,
}: ModifierDetailModalProps) {
  // Which modifier the footer is asking "deactivate?" about; any other one, or reopening, starts fresh.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const confirming = modifier !== null && confirmingId === modifier.id;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmingId(null);
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-xl ${SURFACE}`}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-hairline py-4 pr-3 pl-6">
          {modifier ? (
            <div className="flex min-w-0 flex-col gap-0.5">
              <DialogTitle className="text-lg leading-snug font-semibold text-balance text-ink">
                {modifier.name}
              </DialogTitle>
              <p className="font-mono text-xs break-words text-ink-muted select-all">
                {modifier.code}
              </p>
            </div>
          ) : (
            <DialogTitle className="sr-only">Modifier</DialogTitle>
          )}
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                className="-mt-1 size-10 shrink-0 text-ink-muted hover:text-ink"
              />
            }
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {modifier ? (
          <div className="overflow-y-auto overscroll-contain px-6 pt-4 pb-6">
            {modifier.active ? null : (
              <p className="mb-4 flex items-start gap-2.5 rounded-lg bg-surface-hover px-3 py-2.5 text-sm leading-5 text-ink">
                <Archive
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-ink-muted"
                  strokeWidth={2.25}
                />
                <span>
                  <span className="font-semibold">Inactive.</span> Counters
                  don&apos;t offer it on any item. Reactivate it to offer it
                  again at the prices below.
                </span>
              </p>
            )}

            {modifier.description ? (
              <p className="max-w-[60ch] pb-3 text-sm leading-6 text-pretty text-ink">
                {modifier.description}
              </p>
            ) : null}

            {/* With no description above, the header or the notice already separates the first row. */}
            <dl
              className={
                modifier.description
                  ? undefined
                  : "[&>div:first-child]:border-t-0 [&>div:first-child]:pt-1"
              }
            >
              <DetailRow label="Added">
                {formatDate(modifier.createdAt)}
              </DetailRow>
              <DetailRow label="Last updated">
                {formatDate(modifier.modifiedAt)}
              </DetailRow>
            </dl>

            <UsedOnList
              modifier={modifier}
              uses={uses}
              error={usesError}
              brands={brands}
            />
          </div>
        ) : null}

        {modifier && actionError ? (
          <p
            role="alert"
            className="border-t border-hairline px-6 pt-3 text-sm leading-5 text-danger-ink"
          >
            {actionError}
          </p>
        ) : null}

        {modifier ? (
          <DialogFooter
            className={`mx-0 mb-0 border-hairline bg-transparent px-6 py-4 sm:justify-between ${actionError ? "border-t-0" : ""}`}
          >
            {!modifier.active ? (
              <>
                <p className="hidden self-center text-sm text-ink-muted sm:block">
                  Inactive modifiers can&apos;t be edited.
                </p>
                <Button
                  size="lg"
                  className={ACTION}
                  disabled={pending}
                  onClick={() => onReactivate?.(modifier)}
                >
                  <RotateCcw aria-hidden="true" />
                  {pending ? "Reactivating…" : "Reactivate"}
                </Button>
              </>
            ) : confirming ? (
              // Asked in place, with Keep as the focused, safe default.
              <div
                role="group"
                aria-labelledby="deactivate-modifier-question"
                className="flex w-full flex-col gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 sm:flex-row sm:items-center sm:justify-between"
              >
                <p
                  id="deactivate-modifier-question"
                  className="text-sm leading-5 text-ink"
                >
                  <span className="font-semibold">
                    Deactivate {modifier.name}?
                  </span>{" "}
                  <span className="text-ink-muted">
                    {deactivateConsequence(modifier)}
                  </span>
                </p>
                <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    size="lg"
                    className={ACTION}
                    // Focus moves here so the keyboard isn't stranded on the button that just disappeared.
                    autoFocus
                    onClick={() => setConfirmingId(null)}
                  >
                    Keep modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    className={ACTION}
                    onClick={() => {
                      setConfirmingId(null);
                      onDeactivate?.(modifier);
                    }}
                  >
                    <Ban aria-hidden="true" />
                    Deactivate
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  variant="destructive"
                  size="lg"
                  className={ACTION}
                  disabled={pending}
                  onClick={() => setConfirmingId(modifier.id)}
                >
                  <Ban aria-hidden="true" />
                  {pending ? "Deactivating…" : "Deactivate"}
                </Button>
                <Button
                  size="lg"
                  className={ACTION}
                  disabled={pending}
                  onClick={() => onEdit?.(modifier)}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
              </>
            )}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
