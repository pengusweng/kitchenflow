import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "cn";

type SelectFieldProps = ComponentProps<"select"> & {
  /** Drawn inside the field before the value, e.g. a brand's colour dot. Pad the select to make room. */
  leading?: ReactNode;
  /** Classes for the wrapper; `className` styles the select itself. */
  wrapperClassName?: string;
};

// A native select styled like the Input atom: the OS picker, keyboard and
// screen-reader behaviour come for free.
export default function SelectField({ leading, wrapperClassName, className, children, ...props }: SelectFieldProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      {leading ? (
        <span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 items-center">{leading}</span>
      ) : null}
      <select
        className={cn(
          "h-12 w-full cursor-pointer appearance-none truncate rounded-lg border border-input bg-field pr-9 pl-3 text-base text-ink outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:text-ink-muted md:text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}
