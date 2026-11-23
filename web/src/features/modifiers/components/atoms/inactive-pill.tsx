import { cn } from "cn";

// The same quiet pill menu rows use: a retired thing, not an error.
export default function InactivePill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full border border-hairline px-2 text-xs font-semibold text-ink-muted",
        className,
      )}
    >
      Inactive
    </span>
  );
}
