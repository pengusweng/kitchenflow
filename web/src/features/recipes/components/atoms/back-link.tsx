import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** "← Recipes" above a recipe page's title. */
export default function BackLink() {
  return (
    <Link
      href="/dashboard/recipes"
      className="-ml-1.5 inline-flex h-8 items-center gap-1.5 rounded-md px-1.5 text-sm font-semibold text-ink-muted transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2.25} />
      Recipes
    </Link>
  );
}
