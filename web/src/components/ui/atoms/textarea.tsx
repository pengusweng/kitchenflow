import type { ComponentProps } from "react";
import { cn } from "cn";

// Multi-line text styled like the Input atom.
export default function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-lg border border-input bg-field px-3 py-2.5 text-base leading-6 text-ink caret-primary outline-none transition-colors placeholder:text-ink-muted/80 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
