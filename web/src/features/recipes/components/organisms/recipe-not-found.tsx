import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import BackLink from "../atoms/back-link";

/** For a recipe id the list doesn't have. */
export default function RecipeNotFound() {
  return (
    <section className="motion-safe:animate-page-in">
      <BackLink />
      <div className="mt-3 rounded-xl border border-hairline bg-card px-5 py-8 text-center">
        <PageTitle>Recipe not found</PageTitle>
        <p className="mt-2 text-sm text-ink-muted">It may have been removed, or the link is wrong.</p>
      </div>
    </section>
  );
}
