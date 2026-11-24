import type { ComponentProps } from "react";
import { cn } from "cn";
import { Input } from "@/src/components/ui/atoms/input";

// A peso amount: the ₱ sits inside the field so the number is all anyone types.
export default function PriceInput({ className, ...props }: Omit<ComponentProps<typeof Input>, "type" | "inputMode">) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
      >
        ₱
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn("pl-7 tabular-nums slashed-zero", className)}
        {...props}
      />
    </div>
  );
}
