import type { ComponentProps } from "react";
import { cn } from "cn";
import SelectField from "../atoms/select-field";

type BrandOption = { code: string; name: string; accent: string };

type BrandSelectProps = Omit<ComponentProps<"select">, "value" | "onChange" | "children"> & {
  brands: BrandOption[];
  /** Brand code, or null when nothing is chosen yet. */
  value?: string | null;
  onChange: (code: string) => void;
  placeholder?: string;
};

// A brand picker that keeps the brand's accent dot beside the chosen name, as the tables do.
export default function BrandSelect({
  brands,
  value,
  onChange,
  placeholder = "Choose a brand",
  className,
  ...props
}: BrandSelectProps) {
  const brand = brands.find((b) => b.code === value) ?? null;
  return (
    <SelectField
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      leading={
        brand ? (
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: brand.accent }} />
        ) : null
      }
      className={cn(brand ? "pl-8" : "text-ink-muted", className)}
      {...props}
    >
      {!brand ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {brands.map((b) => (
        <option key={b.code} value={b.code}>
          {b.name}
        </option>
      ))}
    </SelectField>
  );
}
