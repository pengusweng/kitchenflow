import { RefreshCw } from "lucide-react";
import { cn } from "cn";

type WorkspaceHeaderProps = {
  greeting: string;
  roleLabel: string;
  businessDate: string | null;
  day?: string;
  updatedTime: string | null;
  lastUpdatedAt: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export default function WorkspaceHeader({
  greeting,
  roleLabel,
  businessDate,
  day,
  updatedTime,
  lastUpdatedAt,
  isRefreshing,
  onRefresh,
}: WorkspaceHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-hairline pb-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-[1.625rem] leading-[1.15] font-semibold tracking-tight text-ink [overflow-wrap:anywhere] sm:text-[1.875rem]">
          {greeting}
        </h1>
        <p className="text-sm text-ink-muted">
          {roleLabel} workspace
          {businessDate ? (
            <>
              <span aria-hidden="true"> · </span>
              <time aria-label={`Manila business date, ${businessDate}`} dateTime={day}>{businessDate}</time>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
        <p className="min-w-0 text-xs text-ink-muted tabular-nums">
          {updatedTime && lastUpdatedAt !== null ? (
            <>Updated <time dateTime={new Date(lastUpdatedAt).toISOString()}>{updatedTime}</time></>
          ) : isRefreshing ? "Syncing…" : "Awaiting first update"}
        </p>
        <button
          type="button"
          onClick={() => { if (!isRefreshing) onRefresh(); }}
          aria-disabled={isRefreshing}
          aria-label="Refresh workspace data"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-hairline bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted aria-disabled:cursor-wait aria-disabled:text-ink-muted"
        >
          <RefreshCw className={cn("size-4 text-ink-muted", isRefreshing && "motion-safe:animate-spin")} aria-hidden="true" />
          {isRefreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>
    </header>
  );
}
