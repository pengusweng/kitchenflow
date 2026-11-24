import { useId } from "react";
import FilterChip from "@/src/components/ui/atoms/filter-chip";
import type { AvailabilityFilter as Filter } from "../../utils/menu";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
];

type AvailabilityFilterProps = {
  value: Filter;
  onChange: (availability: Filter) => void;
  counts: Record<Filter, number>;
};

export default function AvailabilityFilter({ value, onChange, counts }: AvailabilityFilterProps) {
  const pillId = useId();

  return (
    <div role="group" aria-label="Filter by availability" className="isolate flex flex-wrap gap-2">
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
