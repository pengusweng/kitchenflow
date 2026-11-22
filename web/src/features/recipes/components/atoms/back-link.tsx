import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type BackLinkProps = {
  /** Defaults to the recipes list. */
  href?: string;
  label?: string;
};

/** "← Recipes" (or "← the recipe") above a recipe page's title. */
export default function BackLink({ href = "/dashboard/recipes", label = "Recipes" }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="-ml-1.5 inline-flex h-8 max-w-full items-center gap-1.5 rounded-md px-1.5 text-sm font-semibold text-ink-muted transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <ArrowLeft aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.25} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
