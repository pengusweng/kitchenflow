import type { BrandStatusFilter } from "../../utils/brands";
import { useId } from "react";
import FilterChip from "@/src/components/ui/atoms/filter-chip";

const FILTERS: { value: BrandStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

type StatusFilterProps = {
  value: BrandStatusFilter;
  onChange: (status: BrandStatusFilter) => void;
  counts: Record<BrandStatusFilter, number>;
};

export default function StatusFilter({ value, onChange, counts }: StatusFilterProps) {
  const pillId = useId();

  return (
    <div role="group" aria-label="Filter by status" className="isolate flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <FilterChip
          key={filter.value}
          label={filter.label}
          count={counts[filter.value]}
          selected={value === filter.value}
          onClick={() => onChange(filter.value)}
          pillId={pillId}
        />
      ))}
    </div>
  );
}
