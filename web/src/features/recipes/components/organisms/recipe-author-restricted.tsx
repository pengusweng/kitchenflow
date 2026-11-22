import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";

const COPY = {
  add: {
    title: "New recipe",
    heading: "Only recipe managers and superadmins can add recipes",
    body: "Ask a recipe manager if a dish needs a new recipe. You can still read every recipe.",
  },
  edit: {
    title: "Edit recipe",
    heading: "Only recipe managers and superadmins can edit recipes",
    body: "Ask a recipe manager if a recipe needs changing. You can still read every recipe.",
  },
};

// Shown on /recipes/new and /recipes/[id]/edit to signed-in roles that may read recipes but not write them.
export default function RecipeAuthorRestricted({ action = "add" }: { action?: keyof typeof COPY }) {
  const copy = COPY[action];
  return (
    <section className="motion-safe:animate-page-in">
      <PageTitle>{copy.title}</PageTitle>
      <div className="mt-6 flex max-w-xl items-start gap-4 rounded-xl border border-hairline bg-card px-5 py-5">
        <LockKeyhole aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-6 shrink-0 text-primary-ink" />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold text-ink">{copy.heading}</h2>
          <p className="text-sm leading-relaxed text-ink-muted">{copy.body}</p>
          <Link
            href="/dashboard/recipes"
            className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2.25} />
            Back to recipes
          </Link>
        </div>
      </div>
    </section>
  );
}
