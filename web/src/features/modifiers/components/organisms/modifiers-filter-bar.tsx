"use client";

import SearchField from "@/src/components/ui/molecules/search-field";
import BrandFilter from "@/src/features/menu/components/molecules/brand-filter";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import FilterSelect from "@/src/features/orders/components/molecules/filter-select";
import type { ModifierBrandCounts, StatusFilter } from "../../utils/modifiers";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Active modifiers" },
  { value: "inactive", label: "Inactive modifiers" },
];

type ModifiersFilterBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  status: StatusFilter | undefined;
  onStatusChange: (status: StatusFilter | undefined) => void;
  brands: MenuBrand[];
  brand: string | undefined;
  onBrandChange: (brand: string | undefined) => void;
  counts: ModifierBrandCounts;
  resultCount: number;
  /** Shown when any filter is set. */
  onClear?: () => void;
};

// Same card as the menu filter bar. What to look for above; which brand's
// items offer it below, with the result count at the end.
export default function ModifiersFilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  brands,
  brand,
  onBrandChange,
  counts,
  resultCount,
  onClear,
}: ModifiersFilterBarProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-hairline bg-card p-3 md:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-x-4">
        <SearchField label="Search modifier name or code" value={query} onChange={onQueryChange} />
        <FilterSelect
          label="Filter by modifier status"
          allLabel="All modifiers"
          options={STATUS_OPTIONS}
          value={status}
          onChange={onStatusChange}
          className="sm:w-48"
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-hairline pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
        <BrandFilter brands={brands} value={brand} onChange={onBrandChange} counts={counts} />
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
            {resultCount} {resultCount === 1 ? "modifier" : "modifiers"}
          </p>
        </div>
      </div>
    </div>
  );
}
