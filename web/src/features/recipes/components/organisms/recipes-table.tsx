import type { ReactNode } from "react";
import SortableHead from "@/src/components/ui/molecules/sortable-head";
import { DataTable, DataTableHead } from "@/src/components/ui/organisms/data-table";
import type { Recipe, RecipeSort, RecipeSortField } from "../../utils/recipes";
import { COL, columnCount } from "../../utils/table-columns";
import RecipeRow from "../molecules/recipe-row";
import RecipeSkeletonRow from "../molecules/recipe-skeleton-row";

type RecipesTableProps = {
  recipes: Recipe[];
  /** False when a single brand is picked: every row would say the same brand. */
  showBrand: boolean;
  sort: RecipeSort;
  onSort: (field: RecipeSortField) => void;
  /** Where each row's View link goes. */
  recipeHref: (recipe: Recipe) => string;
  loading?: boolean;
  refreshing?: boolean;
  skeletonRows?: number;
  emptyMessage?: ReactNode;
  footer?: ReactNode;
};

export default function RecipesTable({
  recipes,
  showBrand,
  sort,
  onSort,
  recipeHref,
  loading = false,
  refreshing = false,
  skeletonRows,
  emptyMessage = "No recipes yet.",
  footer,
}: RecipesTableProps) {
  return (
    <DataTable
      columnCount={columnCount(showBrand)}
      loading={loading}
      refreshing={refreshing}
      loadingLabel="Loading recipes…"
      skeletonRows={skeletonRows}
      skeletonRow={(i) => <RecipeSkeletonRow index={i} showBrand={showBrand} />}
      emptyMessage={emptyMessage}
      footer={footer}
      head={
        <>
          <SortableHead field="name" label="Recipe" sort={sort} onSort={onSort} className={COL.recipe} />
          {showBrand ? <DataTableHead className={`hidden md:table-cell ${COL.brand}`}>Brand</DataTableHead> : null}
          <DataTableHead className={`hidden md:table-cell ${COL.version}`}>Version</DataTableHead>
          <SortableHead
            field="modified_at"
            label="Updated"
            sort={sort}
            onSort={onSort}
            className={`hidden lg:table-cell ${COL.updated}`}
          />
          <DataTableHead className={`w-px ${COL.status}`}>Status</DataTableHead>
          <DataTableHead className={`w-px ${COL.view}`}>
            <span className="sr-only">Actions</span>
          </DataTableHead>
        </>
      }
      rows={recipes.map((recipe) => (
        <RecipeRow key={recipe.id} recipe={recipe} showBrand={showBrand} href={recipeHref(recipe)} />
      ))}
    />
  );
}
