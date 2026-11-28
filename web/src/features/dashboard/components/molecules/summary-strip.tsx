import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";

export type SummaryStripItem = {
  id: string;
  label: string;
  value: number | null;
  isLoading: boolean;
  isError: boolean;
  href?: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "attention" | "muted";
};

function valueToneClass(item: SummaryStripItem): string {
  if (item.isError || item.value === null) return "text-ink-muted";
  if (item.tone === "attention" && item.value > 0) return "text-primary-ink";
  if (item.tone === "muted") return "text-ink-muted";
  return "text-ink";
}

function SegmentContent({ item }: { item: SummaryStripItem }) {
  const Icon = item.icon;
  return (
    <>
      <div className="flex items-start justify-between gap-1">
        <span className="inline-flex items-start gap-1.5 text-xs font-medium text-ink-muted sm:text-sm">
          {Icon ? <Icon className="mt-0.5 hidden size-3.5 shrink-0 min-[460px]:block" aria-hidden="true" /> : null}
          <span>{item.label}</span>
        </span>
        {item.href ? (
          <ChevronRight
            className="mt-0.5 size-3.5 shrink-0 text-ink-muted group-hover:text-ink"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        {item.isLoading ? (
          <SkeletonBar className="h-7 w-16" />
        ) : item.isError || item.value === null ? (
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-semibold tracking-tight tabular-nums text-ink-muted" aria-label="Unavailable">
              —
            </span>
            <span className="text-xs text-danger-ink">Couldn&apos;t load</span>
          </div>
        ) : (
          <span className={cn("text-xl font-semibold tracking-tight tabular-nums sm:text-2xl", valueToneClass(item))}>
            {item.value.toLocaleString()}
          </span>
        )}

        {item.hint && !item.isLoading && !item.isError ? (
          <span className="text-xs text-ink-muted">{item.hint}</span>
        ) : null}
      </div>
    </>
  );
}

export default function SummaryStrip({
  label,
  items,
}: {
  label: string;
  items: SummaryStripItem[];
}) {
  return (
    <section aria-label={label}>
      <div className="grid grid-cols-3 divide-x divide-hairline overflow-hidden rounded-xl border border-hairline bg-card">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.id}
              href={item.href}
              className="group flex min-h-[72px] min-w-0 flex-col justify-between gap-1 px-2.5 py-2.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-muted sm:px-4 sm:py-3"
            >
              <SegmentContent item={item} />
            </Link>
          ) : (
            <div key={item.id} className="flex min-h-[72px] min-w-0 flex-col justify-between gap-1 px-2.5 py-2.5 sm:px-4 sm:py-3">
              <SegmentContent item={item} />
            </div>
          ),
        )}
      </div>
    </section>
  );
}
