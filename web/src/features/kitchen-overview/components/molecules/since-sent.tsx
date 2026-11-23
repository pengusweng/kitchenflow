import { cn } from "cn";
import { ageTone, elapsedMs, flagReason, formatElapsed, type KitchenTicket } from "../../utils/tickets";
import ElapsedBar from "../atoms/elapsed-bar";

const REASON: Record<NonNullable<ReturnType<typeof flagReason>>, string> = {
  late: "late",
  rework: "in rework",
  recheck: "waiting for a QC recheck",
};

// The live timer: minutes and seconds since the order reached the kitchen, then the bar.
export default function SinceSent({
  ticket,
  now,
  className,
}: {
  ticket: KitchenTicket;
  now: number;
  className?: string;
}) {
  const ms = elapsedMs(ticket, now);
  const reason = flagReason(ticket, now);
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "w-[3.25rem] shrink-0 font-semibold tabular-nums slashed-zero",
          reason ? "text-danger-ink" : "text-ink",
        )}
      >
        {formatElapsed(ms)}
        {reason ? <span className="sr-only">, {REASON[reason]}</span> : null}
      </span>
      <ElapsedBar ms={ms} tone={ageTone(ms)} flagged={reason !== null} className="min-w-12 flex-1" />
    </span>
  );
}
