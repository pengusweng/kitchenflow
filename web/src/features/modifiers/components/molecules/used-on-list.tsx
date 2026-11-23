import { Ban, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import { formatUsePrice, itemCount, usesByBrand, type Modifier, type ModifierUse } from "../../utils/modifiers";
import InactivePill from "../atoms/inactive-pill";

type UsedOnListProps = {
  modifier: Modifier;
  /** Undefined while they load. */
  uses: ModifierUse[] | undefined;
  /** Why they couldn't be loaded. */
  error?: string;
  brands: MenuBrand[];
};

// Where the modifier shows up at the counter, and what each item charges for
// it. Worth seeing before an edit or a deactivation. Prices and stock are set
// per item, so they're changed from the menu, not here.
export default function UsedOnList({ modifier, uses, error, brands }: UsedOnListProps) {
  // The list row already knows how many, so the heading doesn't wait for the items.
  const count = uses?.length ?? modifier.useCount;

  return (
    <section aria-labelledby="modifier-used-on-heading" aria-busy={!uses && !error} className="mt-5">
      <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2">
        <h3 id="modifier-used-on-heading" className="text-sm font-semibold text-ink">
          Used on
          {count > 0 ? <span className="ml-2 font-normal text-ink-muted tabular-nums">{itemCount(count)}</span> : null}
        </h3>
        <Link
          href="/dashboard/menu"
          className="inline-flex items-center gap-0.5 rounded-sm text-sm font-semibold text-ink underline decoration-hairline underline-offset-4 outline-none hover:decoration-ink focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Open menu
          <ChevronRight aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
        </Link>
      </div>

      <UsedOnBody modifier={modifier} uses={uses} error={error} brands={brands} count={count} />
    </section>
  );
}

function UsedOnBody({ modifier, uses, error, brands, count }: UsedOnListProps & { count: number }) {
  if (error) return <p className="py-4 text-sm leading-5 text-danger-ink">{error}</p>;

  if (!uses) {
    // As many placeholder rows as there are items, up to a few.
    return (
      <div aria-hidden="true" className="pt-3 motion-safe:animate-pulse">
        <SkeletonBar className="mb-2 w-24" />
        {Array.from({ length: Math.min(Math.max(count, 1), 4) }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 border-t border-hairline py-3 first:border-t-0"
          >
            <span className="flex flex-col gap-1">
              <SkeletonBar className={i % 2 ? "w-28" : "w-36"} />
              <SkeletonBar className="w-24" />
            </span>
            <SkeletonBar className="w-14" />
          </div>
        ))}
      </div>
    );
  }

  const groups = usesByBrand(uses, brands);
  // Muted all over once retired: none of these items can sell it now.
  const retired = !modifier.active;

  return (
    <>
      {groups.length === 0 ? (
        <p className="py-4 text-sm leading-5 text-ink-muted">
          Not on any menu item yet. Add it to an item from Menu &amp; availability, where each item sets its own price.
        </p>
      ) : (
        groups.map(({ brand, uses }) => (
          <div key={brand.id} className="pt-3">
            <p className="flex items-center gap-2 pb-1 text-[0.8125rem] font-semibold tracking-[0.02em] text-ink-muted">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: brand.accent }}
              />
              {brand.name}
            </p>
            <ul>
              {uses.map((use) => (
                <li
                  key={use.id}
                  className="flex items-center justify-between gap-3 border-t border-hairline py-2.5 first:border-t-0"
                >
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        retired || !use.itemActive ? "text-ink-muted" : "text-ink",
                      )}
                    >
                      {use.itemName}
                      {use.itemActive ? null : <InactivePill className="ml-2 align-[1px]" />}
                    </span>
                    <span className="font-mono text-xs break-words text-ink-muted">{use.itemCode}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                    <span
                      className={cn(
                        "text-sm tabular-nums slashed-zero",
                        retired || !use.available ? "text-ink-muted" : "text-ink",
                        use.available && !retired && use.price === 0 && "text-ink-muted",
                      )}
                    >
                      {formatUsePrice(use.price)}
                    </span>
                    {!use.available && !retired ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger-ink">
                        <Ban aria-hidden="true" className="size-3" strokeWidth={2.5} />
                        Off on this item
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </>
  );
}
