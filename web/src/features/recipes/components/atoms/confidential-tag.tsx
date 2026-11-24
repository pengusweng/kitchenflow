import { Lock } from "lucide-react";

/** Marks the formulation notes, which only recipe managers and superadmins see. */
export default function ConfidentialTag() {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      title="Only recipe managers and superadmins can see these notes."
    >
      <Lock aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
      Confidential
    </span>
  );
}
