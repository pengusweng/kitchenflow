import { TableCell, TableRow } from "@/components/ui/table";
import BrandLabel from "@/src/components/ui/atoms/brand-label";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";
import { DataTable, DataTableHead } from "@/src/components/ui/organisms/data-table";
import StatusBadge from "@/src/features/brands/components/atoms/status-badge";
import { COL } from "@/src/features/recipes/utils/table-columns";
import { formatRecipeDate, type Recipe } from "@/src/features/recipes/utils/recipes";
import WorkspaceLink from "../atoms/workspace-link";
import { recipesHref } from "../../utils/workspace";

type RecentRecipesPanelProps = {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export default function RecentRecipesPanel({
  recipes,
  isLoading,
  error,
  onRetry,
}: RecentRecipesPanelProps) {
  return (
    <section aria-labelledby="workspace-recipes-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="workspace-recipes-heading" className="text-base font-semibold tracking-tight text-ink">
          Recently updated recipes
        </h2>
        <WorkspaceLink href={recipesHref()} className="shrink-0">All recipes</WorkspaceLink>
      </div>

      <DataTable
        loading={isLoading}
        columnCount={6}
        skeletonRows={4}
        skeletonRow={(index) => (
          <TableRow key={index} className="border-hairline">
            <TableCell className={`px-3 py-3 md:px-4 ${COL.recipe}`}>
              <SkeletonBar className="h-4 w-44" />
            </TableCell>
            <TableCell className={`hidden px-4 py-3 md:table-cell ${COL.brand}`}>
              <SkeletonBar className="h-4 w-28" />
            </TableCell>
            <TableCell className={`hidden px-4 py-3 md:table-cell ${COL.version}`}>
              <SkeletonBar className="h-4 w-10" />
            </TableCell>
            <TableCell className={`hidden px-4 py-3 lg:table-cell ${COL.updated}`}>
              <SkeletonBar className="h-4 w-28" />
            </TableCell>
            <TableCell className={`px-3 py-3 md:px-4 ${COL.status}`}>
              <SkeletonBar className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell className={`py-3 pr-2 pl-1 text-right ${COL.view}`}>
              <SkeletonBar className="ml-auto h-7 w-14" />
            </TableCell>
          </TableRow>
        )}
        emptyMessage={
          error ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="text-danger-ink">{error}</span>
              <button
                type="button"
                onClick={onRetry}
                className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-muted"
              >
                Try again
              </button>
            </div>
          ) : (
            "No recipes have been recorded yet."
          )
        }
        head={
          <>
            <DataTableHead className={COL.recipe}>Recipe</DataTableHead>
            <DataTableHead className={`hidden md:table-cell ${COL.brand}`}>Brand</DataTableHead>
            <DataTableHead className={`hidden md:table-cell ${COL.version}`}>Version</DataTableHead>
            <DataTableHead className={`hidden lg:table-cell ${COL.updated}`}>Updated</DataTableHead>
            <DataTableHead className={COL.status}>Status</DataTableHead>
            <DataTableHead className={COL.view}>
              <span className="sr-only">Open</span>
            </DataTableHead>
          </>
        }
        rows={recipes.map((recipe) => (
          <TableRow key={recipe.id} className="border-hairline hover:bg-surface-hover/50">
            <TableCell className="px-3 py-3 whitespace-normal md:px-4">
              <span className="font-medium text-ink">{recipe.name}</span>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted md:hidden">
                <BrandLabel brand={recipe.brand} />
                <span>·</span>
                <span className="tabular-nums">v{recipe.version}</span>
              </div>
            </TableCell>
            <TableCell className="hidden px-4 py-3 text-ink md:table-cell">
              <BrandLabel brand={recipe.brand} />
            </TableCell>
            <TableCell className="hidden px-4 py-3 tabular-nums text-ink md:table-cell">
              v{recipe.version}
            </TableCell>
            <TableCell className="hidden px-4 py-3 text-ink-muted lg:table-cell">
              {formatRecipeDate(recipe.modifiedAt)}
            </TableCell>
            <TableCell className="px-3 py-3 md:px-4">
              <StatusBadge status={recipe.active ? "active" : "inactive"} />
            </TableCell>
            <TableCell className="py-3 pr-1.5 pl-1 text-right md:pr-2 md:pl-4">
              <WorkspaceLink label={`View recipe ${recipe.name}`} href={`/dashboard/recipes/${recipe.id}`} className="font-semibold text-ink">
                View
              </WorkspaceLink>
            </TableCell>
          </TableRow>
        ))}
      />
    </section>
  );
}
