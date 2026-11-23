"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BrandLabel from "@/src/components/ui/atoms/brand-label";
import DetailRow from "@/src/components/ui/molecules/detail-row";
import {
  elapsedMs,
  flagReason,
  formatElapsed,
  LATE_MIN,
  type FlagReason,
  type KitchenTicket,
} from "../../utils/tickets";
import StageBadge from "../atoms/stage-badge";
import SinceSent from "../molecules/since-sent";
import TicketTimeline from "../molecules/ticket-timeline";

type TicketDetailModalProps = {
  ticket: KitchenTicket | null;
  now: number | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// DESIGN.md › Elevation: dialogs get Shadow 3. Shadows vanish on the dark
// surface, so dark mode swaps it for a hairline edge instead of stacking both.
const SURFACE =
  "shadow-[0_8px_24px_rgba(25,41,62,0.14),0_2px_8px_rgba(25,41,62,0.08)] dark:shadow-none dark:ring-1 dark:ring-hairline";

// Why it's red, and what that means for whoever reads it.
function flagMessage(reason: FlagReason, ticket: KitchenTicket, now: number) {
  const failures = ticket.qcFailures === 1 ? "once" : `${ticket.qcFailures} times`;
  switch (reason) {
    case "late":
      return {
        // Only the ticking figures are tabular; the face gives the period a figure's width too.
        title: (
          <>
            Open <span className="tabular-nums">{formatElapsed(elapsedMs(ticket, now))}</span>.
          </>
        ),
        body: `It passed the ${LATE_MIN}-minute mark since the order was sent.`,
      };
    case "rework":
      return { title: "In rework.", body: "QC sent it back to the cook to fix before checking it again." };
    case "recheck":
      return {
        title: "Waiting for a QC recheck.",
        body: `It has failed QC ${failures} and is back in line to be checked.`,
      };
  }
}

export default function TicketDetailModal({ ticket, now, open, onOpenChange }: TicketDetailModalProps) {
  const reason = ticket && now !== undefined ? flagReason(ticket, now) : null;
  const flag = reason && ticket && now !== undefined ? flagMessage(reason, ticket, now) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl bg-card p-0 text-ink ring-0 sm:max-w-xl ${SURFACE}`}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-hairline py-4 pr-3 pl-6">
          {ticket ? (
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle className="text-lg leading-snug font-semibold text-ink tabular-nums slashed-zero">
                Ticket {ticket.number}
              </DialogTitle>
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                <span className="tabular-nums slashed-zero">Order {ticket.orderCode}</span>
                <span aria-hidden="true">·</span>
                <BrandLabel brand={ticket.brand} />
              </p>
            </div>
          ) : (
            <DialogTitle className="sr-only">Ticket</DialogTitle>
          )}
          <DialogClose
            render={
              <Button variant="ghost" size="icon-lg" className="-mt-1 size-10 shrink-0 text-ink-muted hover:text-ink" />
            }
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {ticket && now !== undefined ? (
          <div className="overflow-y-auto overscroll-contain px-6 pt-4 pb-6">
            {flag ? (
              <p className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#ecb4ad] bg-[#fbebe9] px-3 py-2.5 text-sm leading-5 text-danger-ink dark:border-[oklch(0.68_0.17_27/0.4)] dark:bg-[oklch(0.68_0.17_27/0.14)]">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.25} />
                <span>
                  <span className="font-semibold">{flag.title}</span> {flag.body}
                </span>
              </p>
            ) : null}

            {/* The header or the notice already separates the first row. */}
            <dl className="[&>div:first-child]:border-t-0 [&>div:first-child]:pt-1">
              <DetailRow label="Stage">
                <StageBadge ticket={ticket} />
              </DetailRow>
              <DetailRow label="Since order sent">
                <SinceSent ticket={ticket} now={now} className="max-w-72" />
              </DetailRow>
              {ticket.qcFailures > 0 ? (
                <DetailRow label="Failed QC">
                  <span className="tabular-nums">
                    {ticket.qcFailures === 1 ? "Once" : `${ticket.qcFailures} times`}
                  </span>
                </DetailRow>
              ) : null}
            </dl>

            <TicketTimeline ticket={ticket} flagged={reason !== null} />

            <section aria-labelledby="ticket-items-heading" className="mt-5">
              <h3 id="ticket-items-heading" className="border-b border-hairline pb-2 text-sm font-semibold text-ink">
                Items
                <span className="ml-2 font-normal text-ink-muted tabular-nums">
                  {ticket.items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </h3>
              <ul>
                {ticket.items.map((item) => (
                  <li key={item.id} className="flex gap-3 border-t border-hairline py-2.5 first:border-t-0">
                    <span className="w-7 shrink-0 text-sm font-semibold text-ink tabular-nums">{item.quantity}×</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-ink">{item.name}</span>
                      {item.modifiers.length > 0 ? (
                        <span className="text-sm text-ink-muted">{item.modifiers.join(" · ")}</span>
                      ) : null}
                      {item.notes ? <span className="text-sm text-ink">Note: {item.notes}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
