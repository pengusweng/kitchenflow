import type { QcStatus } from "../../utils/tickets";
import { DANGER, GREEN_DOT, OUTLINE, PILL, QC_TINT } from "./stage-badge";

// Same pill as the stage badge: a fail reads like Rework, a check still going
// reads like In QC, and a pass is outlined with Ready's green dot.
const QC: Record<QcStatus, { label: string; pill: string; dot: string; live?: boolean }> = {
  FAILED: { label: "Failed", pill: DANGER, dot: "bg-current" },
  IN_PROGRESS: { label: "Checking", pill: QC_TINT, dot: "bg-current", live: true },
  PASSED: { label: "Passed", pill: OUTLINE, dot: GREEN_DOT },
};

export default function QcStatusBadge({ status }: { status: QcStatus }) {
  const { label, pill, dot, live } = QC[status];
  return (
    <span className={`${PILL} ${pill}`}>
      <span aria-hidden="true" className="relative flex size-1.5">
        {live ? (
          <span className="absolute inset-0 rounded-full bg-current opacity-50 motion-safe:animate-ping motion-safe:[animation-duration:1.8s]" />
        ) : null}
        <span className={`relative size-1.5 rounded-full ${dot}`} />
      </span>
      {label}
    </span>
  );
}
