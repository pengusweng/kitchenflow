"use client";

import SearchField from "@/src/components/ui/molecules/search-field";
import FilterSelect from "@/src/features/orders/components/molecules/filter-select";
import type { ActiveFilter, AvailabilityFilter as Availability, MenuBrand, MenuCounts } from "../../utils/menu";
import AvailabilityFilter from "../molecules/availability-filter";
import BrandFilter from "../molecules/brand-filter";

const ACTIVE_OPTIONS: { value: ActiveFilter; label: string }[] = [
  { value: "active", label: "Active items" },
  { value: "inactive", label: "Inactive items" },
];

type MenuFilterBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  active: ActiveFilter | undefined;
  onActiveChange: (active: ActiveFilter | undefined) => void;
  brands: MenuBrand[];
  brand: string | undefined;
  onBrandChange: (brand: string | undefined) => void;
  availability: Availability;
  onAvailabilityChange: (availability: Availability) => void;
  counts: MenuCounts;
  resultCount: number;
  /** Shown when any filter is set. */
  onClear?: () => void;
};

// Same card as the orders and staff filter bars. What to look for above; which
// brand and which state below, with the result count at the end.
export default function MenuFilterBar({
  query,
  onQueryChange,
  active,
  onActiveChange,
  brands,
  brand,
  onBrandChange,
  availability,
  onAvailabilityChange,
  counts,
  resultCount,
  onClear,
}: MenuFilterBarProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-hairline bg-card p-3 md:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-x-4">
        <SearchField label="Search item name or code" value={query} onChange={onQueryChange} />
        <FilterSelect
          label="Filter by menu status"
          allLabel="All items"
          options={ACTIVE_OPTIONS}
          value={active}
          onChange={onActiveChange}
          className="sm:w-44"
        />
      </div>
      <div className="border-t border-hairline pt-3">
        <BrandFilter brands={brands} value={brand} onChange={onBrandChange} counts={counts.brands} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
        <AvailabilityFilter value={availability} onChange={onAvailabilityChange} counts={counts.availability} />
        <div className="flex items-center gap-3 sm:ml-auto">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="cursor-pointer rounded-md px-1 text-sm font-semibold text-ink underline decoration-hairline underline-offset-4 outline-none hover:decoration-ink focus-visible:ring-2 focus-visible:ring-primary/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
            >
              Clear filters
            </button>
          ) : null}
          <p aria-live="polite" className="text-sm text-ink-muted tabular-nums">
            {resultCount} {resultCount === 1 ? "item" : "items"}
          </p>
        </div>
      </div>
    </div>
  );
}
