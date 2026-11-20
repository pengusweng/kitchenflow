"use client";

import SearchField from "@/src/components/ui/molecules/search-field";
import type { BrandStatusFilter } from "../../utils/brands";
import StatusFilter from "../molecules/status-filter";

type BrandsFilterBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  status: BrandStatusFilter;
  onStatusChange: (status: BrandStatusFilter) => void;
  counts: Record<BrandStatusFilter, number>;
  resultCount: number;
};

export default function BrandsFilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  counts,
  resultCount,
}: BrandsFilterBarProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-hairline bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-3 md:px-4">
      <SearchField label="Search name or code" value={query} onChange={onQueryChange} />
      <StatusFilter value={status} onChange={onStatusChange} counts={counts} />
      <p aria-live="polite" className="text-sm text-ink-muted tabular-nums sm:ml-auto">
        {resultCount} {resultCount === 1 ? "brand" : "brands"}
      </p>
    </div>
  );
}
