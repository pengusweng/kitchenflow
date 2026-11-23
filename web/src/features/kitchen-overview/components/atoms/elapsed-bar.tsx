import { cn } from "cn";
import { BAR_SPAN_MIN, CAUTION_MIN, LATE_MIN, type AgeTone } from "../../utils/tickets";

const FILL: Record<AgeTone, string> = {
  normal: "bg-ink-muted/45",
  caution: "bg-[#c98213] dark:bg-[oklch(0.8_0.14_75)]",
  late: "bg-[#b42a20] dark:bg-[oklch(0.68_0.17_27)]",
};

const TICKS = [CAUTION_MIN, LATE_MIN].map((min) => `${(min / BAR_SPAN_MIN) * 100}%`);

type ElapsedBarProps = {
  ms: number;
  tone: AgeTone;
  /** Red at any length: in rework or waiting for a recheck. */
  flagged?: boolean;
  className?: string;
};

// How far a ticket has run toward 20 minutes, with notches where it turns
// amber (10) and red (15). Full and red once it's late; red at its real
// length when it's flagged for rework or a recheck.
export default function ElapsedBar({ ms, tone, flagged = false, className }: ElapsedBarProps) {
  const fill = Math.min(ms / (BAR_SPAN_MIN * 60_000), 1);
  return (
    <span aria-hidden="true" className={cn("relative flex h-3 items-center", className)}>
      <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", FILL[flagged ? "late" : tone])}
          style={{ width: `${fill * 100}%` }}
        />
      </span>
      {/* Each notch is an ink line cut out of the bar by a card-colored gap on either side. */}
      {TICKS.map((left) => (
        <span
          key={left}
          className="absolute top-0 h-3 w-[3px] -translate-x-1/2 border-x border-card bg-ink/70"
          style={{ left }}
        />
      ))}
    </span>
  );
}
