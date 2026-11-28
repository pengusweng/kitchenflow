import Link from "next/link";
import { cn } from "cn";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";
import type { KitchenStreamStatus } from "@/src/features/kitchen-overview/hooks/useDayTickets";
import WorkspaceLink from "../atoms/workspace-link";
import KitchenPanelError from "../molecules/kitchen-panel-error";
import { kitchenHref, STAGE_BAR_TONE, type KitchenActivitySummary } from "../../utils/workspace";

type KitchenActivityPanelProps = {
  summary: KitchenActivitySummary | null;
  day?: string;
  streamStatus: KitchenStreamStatus;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const CONNECTION = {
  connecting: { label: "Connecting", tone: "text-ink-muted" },
  reconnecting: { label: "Reconnecting", tone: "text-primary-ink" },
  disconnected: { label: "Disconnected", tone: "text-primary-ink" },
} satisfies Record<Exclude<KitchenStreamStatus, "idle" | "live">, { label: string; tone: string }>;

const SHARE = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 });

function shareLabel(percent: number) {
  return percent < 0.1 ? "<0.1%" : `${SHARE.format(percent)}%`;
}

function TicketDistribution({ summary }: { summary: KitchenActivitySummary }) {
  const segments = summary.stages.filter(({ count }) => count > 0);
  if (segments.length === 0) {
    return <p className="rounded-md bg-surface-hover px-3 py-2 text-sm text-ink-muted">No active kitchen tickets.</p>;
  }

  return (
    <div
      // Only animate redistribution when the same statuses remain present.
      key={segments.map(({ stage }) => stage).join(",")}
      role="img"
      aria-label={`Active ticket distribution: ${segments
        .map(({ label, count, exactPct }) => `${label} ${count} (${shareLabel(exactPct)})`)
        .join(", ")}`}
      className="flex h-2.5 w-full overflow-hidden rounded-full"
    >
      {segments.map(({ stage, label, count, exactPct }) => (
        <div
          key={stage}
          data-stage={stage}
          style={{ flexGrow: count }}
          title={`${label}: ${count} (${shareLabel(exactPct)})`}
          className={cn("min-w-0 basis-0 bg-current motion-safe:transition-[flex-grow] motion-safe:duration-175 motion-safe:ease-out", STAGE_BAR_TONE[stage])}
        />
      ))}
    </div>
  );
}

export default function KitchenActivityPanel({
  summary,
  day,
  streamStatus,
  isLoading,
  error,
  onRetry,
}: KitchenActivityPanelProps) {
  const connection = streamStatus === "idle" || streamStatus === "live" ? null : CONNECTION[streamStatus];

  return (
    <section
      aria-labelledby="workspace-kitchen-heading"
      className="min-w-0 rounded-xl border border-hairline bg-card px-4 pb-3 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 pt-1.5 pb-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 py-1">
          <h2 id="workspace-kitchen-heading" className="text-base font-semibold tracking-tight text-ink">
            Kitchen activity
          </h2>
          {summary ? (
            <span className="text-sm font-semibold text-ink tabular-nums">{summary.totalOpen} open</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5">
          <span role="status" className={cn("inline-flex items-center gap-1.5 text-xs font-medium", connection?.tone)}>
            {connection ? (
              <>
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                {connection.label}
              </>
            ) : null}
          </span>
          <WorkspaceLink href={kitchenHref({ day })} className="-mr-2">Kitchen Overview</WorkspaceLink>
        </div>
      </div>

      {isLoading ? (
        <div aria-busy="true" aria-label="Loading kitchen activity" className="space-y-2">
          <SkeletonBar className="mb-4 h-2.5 w-full rounded-full" />
          {Array.from({ length: 7 }, (_, index) => <SkeletonBar key={index} className="h-8 w-full" />)}
        </div>
      ) : summary ? (
        <div className="space-y-2">
          {error || streamStatus === "reconnecting" || streamStatus === "disconnected" ? (
            <p className="text-xs text-ink-muted">Showing the last kitchen update.</p>
          ) : null}
          <TicketDistribution summary={summary} />
          <ul className="divide-y divide-hairline">
            {summary.stages.map(({ stage, label, count }) => (
              <li key={stage}>
                <Link
                  href={kitchenHref({ day, stage })}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-1 text-sm transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted lg:pointer-fine:min-h-9"
                >
                  <span className={cn("flex min-w-0 items-center gap-2.5", count === 0 ? "text-ink-muted" : "font-medium text-ink")}>
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        stage === "QUEUED" || stage === "FOR_CHECKING" ? "ring-1 ring-current ring-inset" : "bg-current",
                        STAGE_BAR_TONE[stage],
                      )}
                      aria-hidden="true"
                    />
                    {label}
                  </span>
                  <span className={cn("shrink-0 font-semibold tabular-nums", count === 0 ? "text-ink-muted" : "text-ink")}>
                    {count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : error ? <KitchenPanelError message={error} onRetry={onRetry} /> : null}
    </section>
  );
}
