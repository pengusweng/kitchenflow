import { LockKeyhole } from "lucide-react";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";

// Shown in place of Brands to signed-in roles that may not manage brands.
export default function BrandsAccessRestricted() {
  return (
    <section className="motion-safe:animate-page-in">
      <PageTitle>Brands</PageTitle>
      <div className="mt-6 flex max-w-xl items-start gap-4 rounded-xl border border-hairline bg-card px-5 py-5">
        <LockKeyhole aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-6 shrink-0 text-primary-ink" />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-ink">Only superadmins can manage brands</h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            Ask a superadmin if a brand needs to be added or changed.
          </p>
        </div>
      </div>
    </section>
  );
}
