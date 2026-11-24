"use client";

import { useId } from "react";
import { cn } from "cn";
import { CHANNEL_LABEL, formatPeso, type DeliveryChannel } from "../../utils/menu";
import { parsePrice, type ChannelDraft } from "../../utils/menu-form";
import AvailabilitySwitch from "../atoms/availability-switch";
import PriceInput from "./price-input";

type ChannelEditorProps = {
  drafts: ChannelDraft[];
  onChange: (drafts: ChannelDraft[]) => void;
  /** The base price as typed, shown as what a blank price means. */
  basePrice: string;
  errors?: Partial<Record<DeliveryChannel, string>>;
};

/** The price field's id, so the form can move focus to a channel with a bad price. */
export const channelPriceId = (channel: DeliveryChannel) => `channel-price-${channel}`;

// Dine-in and takeaway always sell at the base price. Each delivery platform
// can charge its own (they take a cut) or stop selling the item, e.g. when it
// doesn't travel well. A blank price follows the base price.
export default function ChannelEditor({ drafts, onChange, basePrice, errors = {} }: ChannelEditorProps) {
  const headingId = useId();
  const base = parsePrice(basePrice);
  const update = (channel: DeliveryChannel, patch: Partial<ChannelDraft>) =>
    onChange(drafts.map((d) => (d.channel === channel ? { ...d, ...patch } : d)));

  return (
    <section aria-labelledby={headingId} className="grid gap-2">
      <h3 id={headingId} className="font-semibold text-ink">
        Delivery channels
      </h3>
      <p className="-mt-1 text-[0.8125rem] leading-5 text-ink-muted">
        Dine-in and takeaway always sell at the base price. Leave a price blank to use the base price here too.
      </p>

      <ul className="rounded-lg border border-hairline">
        {drafts.map((draft) => {
          const label = CHANNEL_LABEL[draft.channel];
          const priceId = channelPriceId(draft.channel);
          const error = errors[draft.channel];
          return (
            <li
              key={draft.channel}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-x-3 gap-y-1.5 border-t border-hairline px-3 py-2 first:border-t-0",
                !draft.available && "bg-surface-hover/50",
              )}
            >
              <div className="min-w-0 text-sm">
                <p className={cn("font-semibold", draft.available ? "text-ink" : "text-ink-muted")}>{label}</p>
                <p className={cn("text-[0.8125rem] leading-5", draft.available ? "text-ink-muted" : "text-danger-ink")}>
                  {draft.available ? "Selling" : "Not sold here"}
                </p>
              </div>
              <div>
                <label htmlFor={priceId} className="sr-only">
                  {label} price
                </label>
                <PriceInput
                  id={priceId}
                  value={draft.price}
                  placeholder={base === null ? "Base" : formatPeso(base).replace("₱", "")}
                  onChange={(e) => update(draft.channel, { price: e.target.value })}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${priceId}-error` : undefined}
                  className="h-10 text-right"
                />
              </div>
              <AvailabilitySwitch
                itemName={label}
                available={draft.available}
                onChange={(available) => update(draft.channel, { available })}
                showLabel={false}
              />
              {error ? (
                <p id={`${priceId}-error`} role="alert" className="col-span-full text-sm leading-5 text-danger-ink">
                  {error}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
