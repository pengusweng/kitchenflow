import { AlertTriangle, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { cn } from "cn";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";
import type { KitchenStreamStatus } from "@/src/features/kitchen-overview/hooks/useDayTickets";
import type { FlagReason } from "@/src/features/kitchen-overview/utils/tickets";
import { CHANNEL_LABEL } from "@/src/features/orders/utils/orders";
import WorkspaceLink from "../atoms/workspace-link";
import KitchenPanelError from "../molecules/kitchen-panel-error";
import { kitchenHref, type FlaggedTicketItem } from "../../utils/workspace";

const MAX_SHOWN = 6;
const CONDITIONS = {
  rework: { icon: RotateCcw, tone: "text-danger-ink" },
  recheck: { icon: AlertTriangle, tone: "text-primary-ink" },
  late: { icon: Clock, tone: "text-danger-ink" },
} satisfies Record<FlagReason, { icon: typeof Clock; tone: string }>;

type NeedsAttentionPanelProps = {
  flaggedTickets: FlaggedTicketItem[];
  day?: string;
  streamStatus: KitchenStreamStatus;
  hasData: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export default function NeedsAttentionPanel({
  flaggedTickets,
  day,
  streamStatus,
  hasData,
  isLoading,
  error,
  onRetry,
}: NeedsAttentionPanelProps) {
  const shown = flaggedTickets.slice(0, MAX_SHOWN);
  const remaining = flaggedTickets.length - shown.length;
  const stale = Boolean(error) || streamStatus === "reconnecting" || streamStatus === "disconnected";

  return (
    <section
      aria-labelledby="workspace-attention-heading"
      className="min-w-0 rounded-xl border border-hairline bg-card px-4 pb-3 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 pt-1.5 pb-1">
        <div className="flex items-baseline gap-2.5">
          <h2 id="workspace-attention-heading" className="text-base font-semibold tracking-tight text-ink">
            Needs attention
          </h2>
          {hasData ? (
            <span className="text-sm font-semibold text-ink-muted tabular-nums">
              <span aria-hidden="true">{flaggedTickets.length}</span>
              <span className="sr-only">{flaggedTickets.length} flagged {flaggedTickets.length === 1 ? "ticket" : "tickets"}</span>
            </span>
          ) : null}
        </div>
        <WorkspaceLink href={kitchenHref({ day })} className="-mr-2">View board</WorkspaceLink>
      </div>

      {isLoading ? (
        <div aria-busy="true" aria-label="Loading flagged tickets" className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => <SkeletonBar key={index} className="h-14 w-full" />)}
        </div>
      ) : error && !hasData ? (
        <KitchenPanelError message={error} onRetry={onRetry} />
      ) : shown.length === 0 && hasData ? (
        <p className="flex items-start gap-2 rounded-md bg-surface-hover px-3 py-3 text-sm text-ink-muted">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {stale ? "No flagged tickets in the last kitchen update." : "No tickets need attention."}
        </p>
      ) : hasData ? (
        <>
          {stale ? <p className="text-xs text-ink-muted">Showing the last kitchen update.</p> : null}
          <ul className="divide-y divide-hairline">
            {shown.map(({ ticket, reason, reasonLabel, elapsedLabel }) => {
              const itemCount = ticket.items.reduce((sum, item) => sum + item.quantity, 0);
              const { icon: Icon, tone } = CONDITIONS[reason];

              return (
                <li key={ticket.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink">
                      <span className="font-semibold tabular-nums">#{ticket.number}</span>
                      <span className="font-medium [overflow-wrap:anywhere]">{ticket.brand.name}</span>
                    </p>
                    <p className="text-xs text-ink-muted">
                      {itemCount} {itemCount === 1 ? "item" : "items"} · {CHANNEL_LABEL[ticket.channel]}
                    </p>
                    <p className="flex flex-col items-start gap-x-2 gap-y-0.5 pt-0.5 text-xs sm:flex-row sm:flex-wrap sm:items-center">
                      <span className={cn("inline-flex items-center gap-1.5 font-medium", tone)}>
                        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                        {reasonLabel}
                      </span>
                      <span className="whitespace-nowrap text-ink-muted tabular-nums">
                        Elapsed <span className="inline-block min-w-[7ch]">{elapsedLabel}</span>
                      </span>
                    </p>
                  </div>
                  <WorkspaceLink
                    label={`Inspect ticket ${ticket.number}`}
                    href={kitchenHref({ day, ticketId: ticket.id })}
                    className="-mr-2 font-semibold text-ink"
                  >
                    Inspect
                  </WorkspaceLink>
                </li>
              );
            })}
          </ul>
          {remaining > 0 ? (
            <div className="border-t border-hairline">
              <WorkspaceLink href={kitchenHref({ day })} className="-ml-2">
                View {remaining} more flagged {remaining === 1 ? "ticket" : "tickets"}
              </WorkspaceLink>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
