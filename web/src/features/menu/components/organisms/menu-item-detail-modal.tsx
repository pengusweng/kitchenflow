"use client";

import { X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DetailRow from "@/src/components/ui/molecules/detail-row";
import { CHANNEL_LABEL, formatPeso, type MenuItem } from "../../utils/menu";
import AvailabilitySwitch from "../atoms/availability-switch";
import ItemThumb from "../atoms/item-thumb";

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

export default function MenuItemDetailModal({ item, open, onOpenChange, onAvailabilityChange }: MenuItemDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-xl ${SURFACE}`}
      >
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b border-hairline py-3 pr-3 pl-6">
          {item ? (
            <div className="flex min-w-0 items-center gap-3">
              <ItemThumb item={item} />
              <div className="flex min-w-0 flex-col">
                <DialogTitle className="text-lg leading-snug font-semibold text-ink">{item.name}</DialogTitle>
                <span className="font-mono text-xs break-all text-ink-muted select-all">{item.code}</span>
              </div>
            </div>
          ) : (
            <DialogTitle className="sr-only">Menu item</DialogTitle>
          )}
          <DialogClose
            render={<Button variant="ghost" size="icon-lg" className="size-10 shrink-0 text-ink-muted hover:text-ink" />}
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {item ? (
          <div className="overflow-y-auto px-6 pt-2 pb-6">
            {/* The header already draws a rule above the first row. */}
            <dl className="[&>div:first-child]:border-t-0">
              <DetailRow label="Brand">{item.brand.name}</DetailRow>
              <DetailRow label="Base price">
                <span className="tabular-nums slashed-zero">{formatPeso(item.basePrice)}</span>
              </DetailRow>
              {item.servingDescription ? <DetailRow label="Serving">{item.servingDescription}</DetailRow> : null}
              {item.description ? <DetailRow label="Description">{item.description}</DetailRow> : null}
              <DetailRow label="Recipe">{item.recipe}</DetailRow>
              <DetailRow label="Menu status">{item.active ? "Active" : "Inactive, hidden from ordering"}</DetailRow>
            </dl>

            <section aria-labelledby="menu-item-channels-heading" className="mt-6">
              <h4 id="menu-item-channels-heading" className="mb-1 text-sm font-semibold text-ink">
                Channels
              </h4>
              <ul>
                {item.channels.map(({ channel, price, available }) => (
                  <li
                    key={channel}
                    className="grid grid-cols-[minmax(0,1fr)_auto_6.5rem] items-baseline gap-x-4 border-t border-hairline py-3 text-sm"
                  >
                    <span className="text-ink">{CHANNEL_LABEL[channel]}</span>
                    <span className="text-right text-ink tabular-nums slashed-zero">{formatPeso(price)}</span>
                    <span className={cn("text-right", available ? "text-ink-muted" : "font-semibold text-danger-ink")}>
                      {available ? "On" : "Off"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        {item ? (
          <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between gap-4 border-hairline bg-transparent px-6 py-3 sm:justify-between">
            <p className="text-sm text-ink-muted">{item.available ? "Taking new orders" : "Not taking new orders"}</p>
            <AvailabilitySwitch
              itemName={item.name}
              available={item.available}
              onChange={(available) => onAvailabilityChange(item, available)}
            />
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
