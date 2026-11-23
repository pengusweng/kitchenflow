import {
  formatDuration,
  formatTicketTime,
  QC_REJECTION_LABEL,
  type KitchenTicket,
  type QcAttempt,
} from "../../utils/tickets";
import QcStatusBadge from "../atoms/qc-status-badge";

type QcHistoryProps = {
  ticket: KitchenTicket;
  now: number;
};

const ms = (iso: string) => Date.parse(iso);

// Who checked, when, and for how long; a check still going counts up to now.
function attemptMeta(attempt: QcAttempt, now: number) {
  const started = formatTicketTime(attempt.startedAt).time;
  if (!attempt.completedAt)
    return `${attempt.checker} · started ${started} · ${formatDuration(now - ms(attempt.startedAt))} so far`;
  return `${attempt.checker} · ${started} · ${formatDuration(ms(attempt.completedAt) - ms(attempt.startedAt))}`;
}

// What happened after the last check failed, while nothing newer exists yet.
const AFTER_FAIL: Partial<Record<KitchenTicket["stage"], string>> = {
  REWORKING: "With the cook for rework now",
  FOR_CHECKING: "Fixed and waiting for a recheck",
};

// Every QC check on the ticket, first one first. A failed check lists each
// rejected portion with the checker's note, and the rework that followed sits
// between it and the next check.
export default function QcHistory({ ticket, now }: QcHistoryProps) {
  const attempts = ticket.qcAttempts;
  const itemOf = (id: string) => ticket.items.find((item) => item.id === id);

  return (
    <ol className="flex flex-col">
      {attempts.map((attempt, i) => {
        const next = attempts[i + 1];
        const reworked = attempt.status === "FAILED" && attempt.completedAt;
        // What followed the fail: the rework before the next check, or where it stands now.
        const followUp = !reworked
          ? null
          : next
            ? `Back to the cook · ${formatDuration(ms(next.startedAt) - ms(attempt.completedAt!)).toLowerCase()} of rework`
            : AFTER_FAIL[ticket.stage];
        return (
          <li key={attempt.id} className="border-t border-hairline py-3 first:border-t-0 first:pt-1">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-ink tabular-nums">Check {attempt.number}</h4>
              <QcStatusBadge status={attempt.status} />
            </div>
            <p className="mt-0.5 text-sm text-ink-muted">{attemptMeta(attempt, now)}</p>

            {attempt.rejections.length > 0 ? (
              <ul className="mt-2.5 flex flex-col gap-2" aria-label={`Rejected on check ${attempt.number}`}>
                {attempt.rejections.map((rejection) => {
                  const item = itemOf(rejection.itemId);
                  return (
                    <li key={rejection.id} className="rounded-lg bg-surface-hover/70 px-3 py-2.5 text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="font-semibold text-ink">
                          {item?.name ?? "Removed item"}
                          {item && item.quantity > 1 ? (
                            <span className="font-normal text-ink-muted tabular-nums">
                              {" "}
                              · portion {rejection.portion} of {item.quantity}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[0.8125rem] font-semibold text-danger-ink">
                          {QC_REJECTION_LABEL[rejection.reason]}
                        </span>
                      </div>
                      <p className="mt-1 leading-5 text-ink">{rejection.note}</p>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {followUp ? (
              <p className={`mt-2.5 text-sm ${next ? "text-ink-muted" : "font-semibold text-danger-ink"}`}>
                {followUp}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
