"use client";

import { Archive, Ban, X } from "lucide-react";
import type { ReactNode } from "react";
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
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

function Notice({ tone, icon, children }: { tone: "danger" | "neutral"; icon: ReactNode; children: ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm leading-5 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
        tone === "danger"
          ? "bg-destructive/8 text-danger-ink [&_svg]:text-destructive"
          : "bg-surface-hover text-ink [&_svg]:text-ink-muted",
      )}
    >
      {icon}
      <span>{children}</span>
    </p>
  );
}

// Free add-ons say so instead of "+₱0.00".
function modifierPrice(price: number) {
  return price === 0 ? "Free" : `+${formatPeso(price)}`;
}

export default function MenuItemDetailModal({ item, open, onOpenChange, onAvailabilityChange }: MenuItemDetailModalProps) {
  const notices = item && (!item.available || !item.active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-xl ${SURFACE}`}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-hairline py-4 pr-3 pl-6">
          {item ? (
            <div className="flex min-w-0 items-center gap-3.5">
              <ItemThumb item={item} className="size-12" />
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
            {notices ? (
              <div className="mb-4 flex flex-col gap-2">
                {item.available ? null : (
                  <Notice tone="danger" icon={<Ban strokeWidth={2.25} />}>
                    <span className="font-semibold">Unavailable.</span> No channel can take new orders for this item
                    until it&apos;s switched back on.
                  </Notice>
                )}
                {item.active ? null : (
                  <Notice tone="neutral" icon={<Archive strokeWidth={2.25} />}>
                    <span className="font-semibold">Inactive.</span> Taken off the menu, so it doesn&apos;t show at
                    the counter. A superadmin can reactivate it.
                  </Notice>
                )}
              </div>
            ) : null}

            {item.description ? (
              <p className="max-w-[60ch] pb-3 text-sm leading-6 text-pretty text-ink">{item.description}</p>
            ) : null}

            {/* With no description above, the header's rule already separates the first row. */}
            <dl className={item.description ? undefined : "[&>div:first-child]:border-t-0 [&>div:first-child]:pt-0"}>
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
              paused={!item.available}
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
              paused={!item.available}
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
          <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between gap-4 border-hairline bg-surface-hover/40 px-6 py-3 sm:justify-between">
            <p className={cn("text-sm", item.available ? "text-ink-muted" : "font-semibold text-danger-ink")}>
              {item.available ? "Taking new orders" : "Not taking new orders"}
            </p>
            <AvailabilitySwitch
              itemName={item.name}
              available={item.available}
              onChange={(available) => onAvailabilityChange(item, available)}
              showLabel={false}
            />
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
