"use client";

import { Ban, CircleAlert, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DetailRow from "@/src/components/ui/molecules/detail-row";
import { usePin } from "@/src/features/pin/hooks/usePin";
import type { Brand } from "../../utils/brands";
import BrandIdentity from "../molecules/brand-identity";

type BrandDetailModalProps = {
  brand: Brand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (brand: Brand) => void;
  onDeactivate?: (brand: Brand) => void;
  /** Shown above the footer, e.g. when deactivating fails. */
  error?: string | null;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

export default function BrandDetailModal({
  brand,
  open,
  onOpenChange,
  onEdit,
  onDeactivate,
  error,
}: BrandDetailModalProps) {
  const { isPrompting } = usePin();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // The PIN prompt sits on top of this dialog; its Escape and clicks must not close the brand beneath it.
        if (!next && isPrompting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-lg ${SURFACE}`}
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
          <DialogTitle className="text-base font-semibold text-ink">Brand details</DialogTitle>
          <DialogClose
            render={<Button variant="ghost" size="icon-lg" className="size-10 text-ink-muted hover:text-ink" />}
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {brand ? (
          <div className={`overflow-y-auto px-6 pt-5 ${brand.status === "active" ? "pb-3" : "pb-6"}`}>
            <BrandIdentity brand={brand} />

            <dl className="mt-5">
              <DetailRow label="Created">{brand.createdAt}</DetailRow>
              <DetailRow label="Last updated">{brand.modifiedAt}</DetailRow>
              <DetailRow label="Brand ID">
                <span className="font-mono text-xs break-all text-ink-muted select-all">{brand.id}</span>
              </DetailRow>
            </dl>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mx-6 mb-4 flex items-start gap-2.5 rounded-lg bg-destructive/8 px-3 py-2.5 text-sm leading-5 text-danger-ink dark:text-destructive"
          >
            <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0 text-destructive" />
            {error}
          </p>
        ) : null}

        {/* The API only edits and deactivates active brands (and can't reactivate),
            so inactive brands are view-only. */}
        {brand?.status === "active" ? (
          <DialogFooter className="mx-0 mb-0 border-hairline bg-transparent px-6 py-4 sm:justify-between">
            <Button
              variant="destructive"
              size="lg"
              className="h-10 cursor-pointer px-4 font-semibold"
              onClick={() => onDeactivate?.(brand)}
            >
              <Ban aria-hidden="true" />
              Deactivate
            </Button>
            <Button size="lg" className="h-10 cursor-pointer px-4 font-semibold" onClick={() => onEdit?.(brand)}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
