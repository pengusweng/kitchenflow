"use client";

import { Archive, Ban, Pencil, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DetailRow from "@/src/components/ui/molecules/detail-row";
import { CHANNEL_LABEL, formatPeso, type MenuItem } from "../../utils/menu";
import AvailabilitySwitch from "../atoms/availability-switch";
import ItemThumb from "../atoms/item-thumb";
import OptionList from "../molecules/option-list";

type MenuItemDetailModalProps = {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvailabilityChange: (item: MenuItem, available: boolean) => void;
  onEdit?: (item: MenuItem) => void;
  onDeactivate?: (item: MenuItem) => void;
  onReactivate?: (item: MenuItem) => void;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

const ACTION = "h-10 cursor-pointer px-4 font-semibold";

// Free add-ons say so instead of "+₱0.00".
function modifierPrice(price: number) {
  return price === 0 ? "Free" : `+${formatPeso(price)}`;
}

// The day-to-day control, first thing in the body: whether the item can be
// ordered right now. Off turns the strip into the warning, so state and
// control are one thing rather than a notice plus a switch somewhere else.
function AvailabilityStrip({ item, onChange }: { item: MenuItem; onChange: (available: boolean) => void }) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center justify-between gap-4 rounded-lg py-1.5 pr-2.5 pl-3 transition-colors duration-200",
        item.available ? "bg-surface-hover/70" : "bg-destructive/8",
      )}
    >
      <p className="py-1 text-sm leading-5">
        {item.available ? (
          <span className="font-semibold text-ink">Taking new orders</span>
        ) : (
          <span className="text-danger-ink">
            <Ban aria-hidden="true" className="mr-1.5 inline size-4 align-[-0.1875rem]" strokeWidth={2.25} />
            <span className="font-semibold">Not taking new orders.</span> No channel can sell it until it&apos;s
            switched back on.
          </span>
        )}
      </p>
      <AvailabilitySwitch itemName={item.name} available={item.available} onChange={onChange} showLabel={false} />
    </div>
  );
}

export default function MenuItemDetailModal({
  item,
  open,
  onOpenChange,
  onAvailabilityChange,
  onEdit,
  onDeactivate,
  onReactivate,
}: MenuItemDetailModalProps) {
  // Which item the footer is asking "deactivate?" about; any other item, or reopening, starts fresh.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const confirming = item !== null && confirmingId === item.id;

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
          {item ? (
            <div className="flex min-w-0 items-center gap-3.5">
              <ItemThumb item={item} dim={!item.active} className="size-12" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <DialogTitle className="text-lg leading-snug font-semibold text-balance text-ink">{item.name}</DialogTitle>
                <p className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.brand.accent }}
                  />
                  {item.brand.name}
                </p>
                <p className="font-mono text-xs break-words text-ink-muted select-all">{item.code}</p>
              </div>
            </div>
          ) : (
            <DialogTitle className="sr-only">Menu item</DialogTitle>
          )}
          <DialogClose
            render={<Button variant="ghost" size="icon-lg" className="-mt-1 size-10 shrink-0 text-ink-muted hover:text-ink" />}
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {item ? (
          <div className="overflow-y-auto overscroll-contain px-6 pt-4 pb-6">
            {item.active ? (
              <AvailabilityStrip item={item} onChange={(available) => onAvailabilityChange(item, available)} />
            ) : (
              <p className="mb-4 flex items-start gap-2.5 rounded-lg bg-surface-hover px-3 py-2.5 text-sm leading-5 text-ink">
                <Archive aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={2.25} />
                <span>
                  <span className="font-semibold">Inactive.</span> Taken off the menu, so it doesn&apos;t show at the
                  counter or on delivery. Reactivate it to sell it again.
                </span>
              </p>
            )}

            {item.description ? (
              <p className="max-w-[60ch] pb-3 text-sm leading-6 text-pretty text-ink">{item.description}</p>
            ) : null}

            {/* With no description above, the strip already separates the first row. */}
            <dl className={item.description ? undefined : "[&>div:first-child]:border-t-0 [&>div:first-child]:pt-1"}>
              <DetailRow label="Base price">
                <span className="font-semibold tabular-nums slashed-zero">{formatPeso(item.basePrice)}</span>
              </DetailRow>
              {item.servingDescription ? <DetailRow label="Serving">{item.servingDescription}</DetailRow> : null}
              <DetailRow label="Recipe">{item.recipe}</DetailRow>
            </dl>

            <OptionList
              id="menu-item-channels-heading"
              title="Channels"
              empty="Not offered on any channel."
              paused={item.active && !item.available}
              options={item.channels.map((c) => ({
                key: c.channel,
                label: CHANNEL_LABEL[c.channel],
                price: formatPeso(c.price),
                available: c.available,
              }))}
            />

            <OptionList
              id="menu-item-modifiers-heading"
              title="Modifiers"
              empty="No modifiers on this item."
              paused={item.active && !item.available}
              options={item.modifiers.map((m) => ({
                key: m.id,
                label: m.name,
                hint: m.description,
                price: modifierPrice(m.price),
                available: m.available,
              }))}
            />
          </div>
        ) : null}

        {item ? (
          <DialogFooter className="mx-0 mb-0 border-hairline bg-transparent px-6 py-4 sm:justify-between">
            {!item.active ? (
              <>
                <p className="hidden self-center text-sm text-ink-muted sm:block">Inactive items can&apos;t be edited.</p>
                <Button size="lg" className={ACTION} onClick={() => onReactivate?.(item)}>
                  <RotateCcw aria-hidden="true" />
                  Reactivate
                </Button>
              </>
            ) : confirming ? (
              // Asked in place, with Keep as the focused, safe default.
              <div
                role="group"
                aria-labelledby="deactivate-menu-item-question"
                className="flex w-full flex-col gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 sm:flex-row sm:items-center sm:justify-between"
              >
                <p id="deactivate-menu-item-question" className="text-sm leading-5 text-ink">
                  <span className="font-semibold">Deactivate {item.name}?</span>{" "}
                  <span className="text-ink-muted">It comes off every channel. You can reactivate it later.</span>
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
                    Keep item
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    className={ACTION}
                    onClick={() => {
                      setConfirmingId(null);
                      onDeactivate?.(item);
                    }}
                  >
                    <Ban aria-hidden="true" />
                    Deactivate
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button variant="destructive" size="lg" className={ACTION} onClick={() => setConfirmingId(item.id)}>
                  <Ban aria-hidden="true" />
                  Deactivate
                </Button>
                <Button size="lg" className={ACTION} onClick={() => onEdit?.(item)}>
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
