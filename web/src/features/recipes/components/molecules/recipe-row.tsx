import { cn } from "cn";
import { TableCell, TableRow } from "@/components/ui/table";
import BrandLabel from "@/src/components/ui/atoms/brand-label";
import ViewButton from "@/src/components/ui/atoms/view-button";
import StatusBadge from "@/src/features/brands/components/atoms/status-badge";
import { formatRecipeDate, type Recipe } from "../../utils/recipes";

type RecipeRowProps = {
  recipe: Recipe;
  /** False when a single brand is picked and the Brand column is dropped. */
  showBrand: boolean;
  /** The recipe's page. */
  href: string;
};

export default function RecipeRow({ recipe, showBrand, href }: RecipeRowProps) {
  const updated = formatRecipeDate(recipe.modifiedAt);

  return (
    <TableRow className="border-hairline hover:bg-surface-hover/50">
      <TableCell className="px-3 py-3 whitespace-normal md:px-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("font-semibold", recipe.active ? "text-ink" : "text-ink-muted")}>{recipe.name}</span>
          {/* Codes wrap at their hyphens, never mid-word. */}
          <span className="font-mono text-xs break-words text-ink-muted">{recipe.code}</span>
          {/* Narrow screens drop the Brand, Version and Updated columns; they ride along here instead. */}
          <span className="text-ink-muted md:hidden">
            {showBrand ? <>{recipe.brand.name} · </> : null}
            <span className="tabular-nums">v{recipe.version}</span> · {updated}
          </span>
          <span className="hidden text-ink-muted md:block lg:hidden">Updated {updated}</span>
        </div>
      </TableCell>
      {showBrand ? (
        <TableCell className="hidden px-4 py-3 text-ink md:table-cell xl:whitespace-normal">
          <BrandLabel brand={recipe.brand} />
        </TableCell>
      ) : null}
      <TableCell className="hidden px-4 py-3 text-ink tabular-nums md:table-cell">v{recipe.version}</TableCell>
      <TableCell className="hidden px-4 py-3 text-ink lg:table-cell">
        <time dateTime={recipe.modifiedAt}>{updated}</time>
      </TableCell>
      <TableCell className="px-3 py-3 md:px-4">
        <StatusBadge status={recipe.active ? "active" : "inactive"} />
      </TableCell>
      <TableCell className="py-3 pr-1.5 pl-1 text-right md:pr-2 md:pl-4">
        <ViewButton label={`View ${recipe.name}`} href={href} />
      </TableCell>
    </TableRow>
  );
}
