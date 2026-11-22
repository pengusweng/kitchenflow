"use client";

import SearchField from "@/src/components/ui/molecules/search-field";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import FilterSelect from "@/src/features/orders/components/molecules/filter-select";
import type { RecipeStatusFilter } from "../../utils/recipes";

const STATUS_OPTIONS: { value: RecipeStatusFilter; label: string }[] = [
  { value: "active", label: "Active recipes" },
  { value: "inactive", label: "Inactive recipes" },
];

type RecipesFilterBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  status: RecipeStatusFilter | undefined;
  onStatusChange: (status: RecipeStatusFilter | undefined) => void;
  brands: MenuBrand[];
  brand: string | undefined;
  onBrandChange: (brand: string | undefined) => void;
  resultCount: number;
  /** Shown when any filter is set. */
  onClear?: () => void;
};

// Same card as the menu, orders and staff filter bars: search and the two
// pickers on one line, with the result count at the end.
export default function RecipesFilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  brands,
  brand,
  onBrandChange,
  resultCount,
  onClear,
}: RecipesFilterBarProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-hairline bg-card p-3 md:px-4 xl:flex-row xl:items-center xl:gap-x-4">
      <SearchField label="Search recipe name or code" value={query} onChange={onQueryChange} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-x-4">
        <FilterSelect
          label="Filter by brand"
          allLabel="All brands"
          options={brands.map((b) => ({ value: b.code, label: b.name }))}
          value={brand}
          onChange={onBrandChange}
          className="sm:w-48"
        />
        <FilterSelect
          label="Filter by recipe status"
          allLabel="All recipes"
          options={STATUS_OPTIONS}
          value={status}
          onChange={onStatusChange}
          className="sm:w-44"
        />
        <div className="flex items-center gap-3 sm:ml-auto xl:ml-0">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="cursor-pointer rounded-md px-1 text-sm font-semibold whitespace-nowrap text-ink underline decoration-hairline underline-offset-4 outline-none hover:decoration-ink focus-visible:ring-2 focus-visible:ring-primary/40 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
            >
              Clear filters
            </button>
          ) : null}
          <p aria-live="polite" className="text-sm whitespace-nowrap text-ink-muted tabular-nums">
            {resultCount} {resultCount === 1 ? "recipe" : "recipes"}
          </p>
        </div>
      </div>
    </div>
  );
}
