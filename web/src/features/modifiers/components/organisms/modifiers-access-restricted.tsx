import { LockKeyhole } from "lucide-react";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";

// Shown in place of Modifiers to signed-in roles that may not manage them.
export default function ModifiersAccessRestricted() {
  return (
    <section className="motion-safe:animate-page-in">
      <PageTitle>Modifiers</PageTitle>
      <div className="mt-6 flex max-w-xl items-start gap-4 rounded-xl border border-hairline bg-card px-5 py-5">
        <LockKeyhole aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-6 shrink-0 text-primary-ink" />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-ink">Only superadmins and recipe managers can manage modifiers</h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Ask a recipe manager if a modifier needs to be added or renamed.
          </p>
        </div>
      </div>
    </section>
  );
}
