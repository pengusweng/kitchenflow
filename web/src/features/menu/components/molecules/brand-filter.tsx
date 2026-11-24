import { useId } from "react";
import FilterChip from "@/src/components/ui/atoms/filter-chip";
import type { MenuBrand, MenuCounts } from "../../utils/menu";

type BrandFilterProps = {
  brands: MenuBrand[];
  /** Brand code; undefined means every brand. */
  value: string | undefined;
  onChange: (brand: string | undefined) => void;
  counts: MenuCounts["brands"];
};

// Brand is the page's main axis, so every brand is one tap away instead of
// behind a select. Each chip also says how many of its items are off, so a
// shortage in one brand shows even while looking at another.
export default function BrandFilter({ brands, value, onChange, counts }: BrandFilterProps) {
  const pillId = useId();
  const chips = [
    { code: undefined, label: "All brands", key: "all" },
    ...brands.map((brand) => ({ code: brand.code, label: brand.name, key: brand.code })),
  ];

  return (
    <div role="group" aria-label="Filter by brand" className="isolate flex flex-wrap gap-2">
      {chips.map((chip) => {
        const count = counts[chip.key] ?? { total: 0, unavailable: 0 };
        return (
          <FilterChip
            key={chip.key}
            label={chip.label}
            count={count.total}
            flag={count.unavailable > 0 ? `${count.unavailable} off` : undefined}
            selected={value === chip.code}
            onClick={() => onChange(chip.code)}
            pillId={pillId}
          />
        );
      })}
    </div>
  );
}
