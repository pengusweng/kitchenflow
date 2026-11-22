"use client";

import { ChevronDown, Plus, Undo2, X } from "lucide-react";
import { useId } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { formatPeso, type MenuModifierOption } from "../../utils/menu";
import { newModifierDraft, parsePrice, type ModifierDraft } from "../../utils/menu-form";
import PriceInput from "./price-input";

type ModifierEditorProps = {
  drafts: ModifierDraft[];
  onChange: (drafts: ModifierDraft[]) => void;
  /** Every modifier that can be attached; ones already on the item are left out of the picker. */
  catalog: MenuModifierOption[];
  /** Keyed by draft id. */
  errors?: Record<string, string>;
  /** Tag modifiers added during this edit. Off when the whole item is new. */
  tagNew?: boolean;
};

const TAG = "inline-flex h-5 items-center rounded-full px-2 text-xs font-semibold";

/** The price field's id, so the form can move focus to a modifier with a bad price. */
export const modifierPriceId = (draftId: string) => `modifier-price-${draftId}`;

// The item's add-ons, each with its own price. Removing a saved one strikes it
// through with an Undo instead of deleting it on the spot, so a slip costs
// nothing until Save. New ones are tagged so it's clear what Save will add.
export default function ModifierEditor({ drafts, onChange, catalog, errors = {}, tagNew = true }: ModifierEditorProps) {
  const pickerId = useId();
  const attached = new Set(drafts.map((d) => d.code));
  const available = catalog.filter((option) => !attached.has(option.code));
  const kept = drafts.filter((d) => !d.removed).length;

  const update = (id: string, patch: Partial<ModifierDraft>) =>
    onChange(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const remove = (draft: ModifierDraft) =>
    draft.origin === "new" ? onChange(drafts.filter((d) => d.id !== draft.id)) : update(draft.id, { removed: true });

  const add = (code: string) => {
    const option = catalog.find((o) => o.code === code);
    if (option) onChange([...drafts, newModifierDraft(option)]);
  };

  return (
    <section aria-labelledby={`${pickerId}-heading`} className="grid gap-2">
      <h3 id={`${pickerId}-heading`} className="flex items-baseline justify-between gap-4 font-semibold text-ink">
        Modifiers
        <span className="text-[0.8125rem] font-normal text-ink-muted tabular-nums">
          {kept === 1 ? "1 on this item" : `${kept} on this item`}
        </span>
      </h3>

      {drafts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline px-3 py-4 text-center text-sm text-ink-muted">
          No modifiers yet. Add one below.
        </p>
      ) : (
        <ul className="rounded-lg border border-hairline">
          {drafts.map((draft) => {
            const error = errors[draft.id];
            const priceId = modifierPriceId(draft.id);
            const savedPrice = parsePrice(draft.price);
            return (
              <li
                key={draft.id}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_7rem_2.5rem] items-center gap-x-3 gap-y-1.5 border-t border-hairline px-3 py-2.5 first:border-t-0",
                  draft.removed && "bg-surface-hover/50",
                  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
                )}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span
                      className={cn(
                        "font-semibold",
                        draft.removed ? "text-ink-muted line-through decoration-ink-muted/60" : "text-ink",
                      )}
                    >
                      {draft.name}
                    </span>
                    {tagNew && draft.origin === "new" ? <span className={`${TAG} bg-ink text-card`}>New</span> : null}
                    {!draft.available && !draft.removed ? (
                      <span className={`${TAG} bg-destructive/10 text-danger-ink`}>Off</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] leading-5 text-ink-muted">
                    {draft.removed ? "Removed when you save" : draft.description ?? draft.code}
                  </p>
                </div>

                {draft.removed ? (
                  <p className="text-right text-sm text-ink-muted tabular-nums line-through decoration-ink-muted/60">
                    {savedPrice === null ? "—" : savedPrice === 0 ? "Free" : `+${formatPeso(savedPrice)}`}
                  </p>
                ) : (
                  <div>
                    <label htmlFor={priceId} className="sr-only">
                      {draft.name} add-on price
                    </label>
                    <PriceInput
                      id={priceId}
                      value={draft.price}
                      onChange={(e) => update(draft.id, { price: e.target.value })}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `${priceId}-error` : undefined}
                      // A freshly added modifier wants its price checked next.
                      autoFocus={draft.origin === "new"}
                      className="h-10 text-right"
                    />
                  </div>
                )}

                {draft.removed ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="size-10 cursor-pointer text-ink-muted hover:text-ink"
                    onClick={() => update(draft.id, { removed: false })}
                    aria-label={`Undo removing ${draft.name}`}
                    title="Undo"
                  >
                    <Undo2 aria-hidden="true" className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="size-10 cursor-pointer text-ink-muted hover:bg-destructive/10 hover:text-danger-ink"
                    onClick={() => remove(draft)}
                    aria-label={`Remove ${draft.name}`}
                    title="Remove"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                )}

                {error ? (
                  <p id={`${priceId}-error`} role="alert" className="col-span-full text-sm leading-5 text-danger-ink">
                    {error}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative">
        <label htmlFor={pickerId} className="sr-only">
          Add a modifier
        </label>
        <Plus
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2",
            available.length === 0 ? "text-ink-muted" : "text-ink",
          )}
          strokeWidth={2.25}
        />
        <select
          id={pickerId}
          value=""
          disabled={available.length === 0}
          onChange={(e) => add(e.target.value)}
          className="h-12 w-full cursor-pointer appearance-none truncate rounded-lg border border-dashed border-input bg-field pr-9 pl-9 text-base font-semibold text-ink outline-none hover:border-solid focus-visible:border-solid focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:font-normal disabled:text-ink-muted md:text-sm"
        >
          <option value="" disabled>
            {available.length === 0 ? "Every modifier is on this item" : "Add a modifier…"}
          </option>
          {available.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name} ({option.price === 0 ? "free" : `+${formatPeso(option.price)}`})
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
        />
      </div>
    </section>
  );
}
