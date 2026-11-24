import { isRecheck, STAGE_LABEL, type KitchenTicket, type TicketStage } from "../../utils/tickets";

// Same pill as the order status badge. Color goes to where the work is: the
// cook's and the checker's stages get a tint, rework and a recheck get the
// danger tint, and the waiting ends (queued, acknowledged, ready) are outlined.
export const OUTLINE = "border-ink-muted/30 text-ink-muted";
export const DANGER =
  "border-[#ecb4ad] bg-[#fbebe9] text-danger-ink dark:border-[oklch(0.68_0.17_27/0.4)] dark:bg-[oklch(0.68_0.17_27/0.14)]";
/** The checker's stages. */
export const QC_TINT =
  "border-[#d7c3e6] bg-[#f4edf9] text-[#5d3a7a] dark:border-[oklch(0.7_0.1_310/0.4)] dark:bg-[oklch(0.7_0.1_310/0.14)] dark:text-[oklch(0.86_0.06_310)]";
/** Ready, and a passed check. */
export const GREEN_DOT = "bg-[#2e8a52] dark:bg-[oklch(0.72_0.13_150)]";
/** The pill itself; each badge adds its colors. */
export const PILL =
  "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[0.8125rem] font-semibold whitespace-nowrap";

const STAGE: Record<TicketStage, { pill: string; dot: string; live?: boolean }> = {
  QUEUED: { pill: OUTLINE, dot: "ring-1 ring-current ring-inset" },
  ACKNOWLEDGED: { pill: OUTLINE, dot: "bg-current" },
  PREPARING: {
    pill: "border-[#a5c6e8] bg-[#e6f0fa] text-[#1b5a96] dark:border-[oklch(0.62_0.12_250/0.4)] dark:bg-[oklch(0.62_0.12_250/0.14)] dark:text-[oklch(0.84_0.08_250)]",
    dot: "bg-current",
    live: true,
  },
  REWORKING: { pill: DANGER, dot: "bg-current", live: true },
  FOR_CHECKING: {
    pill: QC_TINT,
    dot: "ring-1 ring-current ring-inset",
  },
  CHECKING: {
    pill: QC_TINT,
    dot: "bg-current",
    live: true,
  },
  READY: { pill: OUTLINE, dot: GREEN_DOT },
  // Off the line: the quietest pill on the page.
  HANDED_OVER: { pill: "border-ink-muted/20 text-ink-muted", dot: "bg-ink-muted/50" },
};

export default function StageBadge({ ticket }: { ticket: KitchenTicket }) {
  const recheck = isRecheck(ticket);
  const { pill, dot, live } = recheck ? { pill: DANGER, dot: "ring-1 ring-current ring-inset" } : STAGE[ticket.stage];
  return (
    <span className={`${PILL} ${pill}`}>
      <span aria-hidden="true" className="relative flex size-1.5">
        {/* Stages where someone is working on it right now breathe slowly. */}
        {live ? (
          <span className="absolute inset-0 rounded-full bg-current opacity-50 motion-safe:animate-ping motion-safe:[animation-duration:1.8s]" />
        ) : null}
        <span className={`relative size-1.5 rounded-full ${dot}`} />
      </span>
      {recheck ? "QC recheck" : STAGE_LABEL[ticket.stage]}
    </span>
  );
}
