import { cn } from "cn";
import { formatGap, formatTicketTime, ticketTimeline, type KitchenTicket } from "../../utils/tickets";

// To the minute, with the day only when a step falls on a different one from the order.
function stepTime(at: string, orderSentAt: string) {
  const step = formatTicketTime(at);
  return step.date === formatTicketTime(orderSentAt).date ? step.time : `${step.date}, ${step.time}`;
}

type TicketTimelineProps = {
  ticket: KitchenTicket;
  /** Red when the ticket needs attention, like its row. */
  flagged: boolean;
};

// The same rail as the order history: quiet dots for what's done, the latest
// step in color, and the steps still to come drawn open and muted. Each step
// says how long it took after the one before, so a slow stretch stands out.
export default function TicketTimeline({ ticket, flagged }: TicketTimelineProps) {
  const steps = ticketTimeline(ticket);
  const latest = steps.findLastIndex((step) => step.at !== null);
  const currentDot = flagged
    ? "bg-[#c2372e] dark:bg-[oklch(0.68_0.17_27)]"
    : ticket.stage === "READY"
      ? "bg-[#2e8a52] dark:bg-[oklch(0.72_0.13_150)]"
      : "bg-[#1b5a96] dark:bg-[oklch(0.74_0.11_250)]";

  return (
    <section aria-labelledby="ticket-timeline-heading" className="mt-5">
      <h3 id="ticket-timeline-heading" className="mb-1 text-sm font-semibold text-ink">
        Timeline
      </h3>

      <ol className="border-t border-hairline pt-3">
        {steps.map((step, index) => {
          const reached = step.at !== null;
          const current = index === latest;
          const previous = steps[index - 1]?.at;
          const nextReached = steps[index + 1]?.at != null;
          return (
            <li key={step.key} className="relative grid grid-cols-[0.625rem_minmax(0,1fr)_auto] gap-x-3 pb-4 last:pb-0">
              {/* The rail runs from this dot down to the next one, dashed where the ticket hasn't been yet. */}
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[1.125rem] -bottom-1 left-[calc(0.3125rem-0.5px)] w-px",
                    nextReached ? "bg-hairline" : "border-l border-dashed border-ink-muted/35",
                  )}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 size-2.5 rounded-full",
                  current
                    ? currentDot
                    : reached
                      ? "border-[1.5px] border-ink-muted/45 bg-card"
                      : "border-[1.5px] border-dashed border-ink-muted/40 bg-card",
                )}
              />
              <div className="min-w-0 text-sm">
                <p className={cn(current ? "font-semibold text-ink" : reached ? "text-ink" : "text-ink-muted")}>
                  {step.label}
                </p>
                {step.at && previous ? (
                  <p className="mt-0.5 text-[0.8125rem] leading-5 text-ink-muted">
                    {formatGap(Date.parse(step.at) - Date.parse(previous))}
                  </p>
                ) : null}
              </div>
              {step.at ? (
                <time
                  dateTime={step.at}
                  className="text-right text-[0.8125rem] leading-5 whitespace-nowrap text-ink-muted"
                >
                  {stepTime(step.at, ticket.orderSentAt)}
                </time>
              ) : (
                <span className="text-right text-[0.8125rem] leading-5 whitespace-nowrap text-ink-muted/80">
                  Not yet
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
