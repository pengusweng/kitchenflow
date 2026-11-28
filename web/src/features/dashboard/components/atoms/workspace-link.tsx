import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import type { ReactNode } from "react";

export default function WorkspaceLink({ href, label, children, className }: {
  href: string;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted",
        className,
      )}
    >
      {children}
      <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" />
    </Link>
  );
}
