"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { replaceSearchParams } from "@/src/lib/search-params";
import { nextSort } from "@/src/lib/table-sort";
import RecipesFilterBar from "../components/organisms/recipes-filter-bar";
import RecipesTable from "../components/organisms/recipes-table";
import { useRecipeBrands } from "../hooks/useRecipeBrands";
import { useRecipes } from "../hooks/useRecipes";
import { RECIPES_PAGE_SIZE, toRecipe, type RecipeSort, type RecipeStatusFilter } from "../utils/recipes";

// Every brand by default, most recently updated first. Picking a brand narrows
// the table and the URL keeps it (?brand=GC), as on the menu page. Search,
// filters, sorting and paging all happen on the API (GET /recipes).
export default function RecipesPage({ canCreate }: { canCreate: boolean }) {
  const searchParams = useSearchParams();
  const brands = useRecipeBrands();
  const brandParam = searchParams.get("brand")?.toUpperCase();
  const brandRecord = brandParam ? brands.brands.find((b) => b.code === brandParam) : undefined;
  const brand = brandRecord?.code;

  const statusParam = searchParams.get("status")?.toLowerCase();
  const status: RecipeStatusFilter | undefined =
    statusParam === "all" ? undefined : statusParam === "inactive" ? "inactive" : "active";

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<RecipeSort>(null);
  const search = useDebouncedValue(query.trim());

  // Any filter or sort change returns to page 1.
  const filterKey = `${brand ?? ""}|${status ?? ""}|${search}|${sort ? `${sort.by}:${sort.order}` : ""}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  function setBrand(code: string | undefined) {
    replaceSearchParams(searchParams, (params) => {
      if (code) params.set("brand", code);
      else params.delete("brand");
    });
  }

  function setStatus(next: RecipeStatusFilter | undefined) {
    replaceSearchParams(searchParams, (params) => {
      if (next === undefined) params.set("status", "all");
      else if (next === "inactive") params.set("status", "inactive");
      else params.delete("status");
    });
  }

  // A ?brand= link waits for the brands, so the table doesn't flash every brand first.
  const waitingForBrand = Boolean(brandParam) && brands.isPending;
  const recipes = useRecipes(
    {
      page,
      limit: RECIPES_PAGE_SIZE,
      status: status ?? "all",
      search: search || undefined,
      brandId: brandRecord?.id,
      // The API's own default is newest first; the table defaults to most recently updated.
      sortBy: sort?.by ?? "modified_at",
      sortOrder: sort ? sort.order : "desc",
    },
    !waitingForBrand,
  );

  const rows = (recipes.data?.data ?? []).map((record) => toRecipe(record, brands.brandFor(record.brand_id)));
  const total = recipes.data?.meta.total ?? 0;
  const totalPages = Math.max(1, recipes.data?.meta.totalPages ?? 1);

  const filtered = Boolean(query.trim() || brand || status !== "active");
  let emptyMessage = filtered ? "No recipes match these filters." : "No recipes yet.";
  if (recipes.error) emptyMessage = recipes.error.message;

  return (
    <section className="motion-safe:animate-page-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Recipes</PageTitle>
        {canCreate ? (
          // Starts the new recipe on the brand the table is narrowed to.
          <Link
            href={brand ? `/dashboard/recipes/new?brand=${brand}` : "/dashboard/recipes/new"}
            className={buttonVariants({ size: "lg", className: "h-10 px-4 font-semibold" })}
          >
            <Plus aria-hidden="true" />
            Add recipe
          </Link>
        ) : null}
      </div>

      <RecipesFilterBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        brands={brands.brands}
        brand={brand}
        onBrandChange={setBrand}
        resultCount={total}
        onClear={
          filtered
            ? () => {
                setQuery("");
                setBrand(undefined);
                setStatus("active");
              }
            : undefined
        }
      />

      <RecipesTable
        recipes={rows}
        showBrand={!brand}
        sort={sort}
        onSort={(by) => setSort((current) => nextSort(current, by))}
        recipeHref={(recipe) => `/dashboard/recipes/${recipe.id}`}
        loading={recipes.isPending || brands.isPending}
        refreshing={recipes.isPlaceholderData}
        emptyMessage={emptyMessage}
        footer={
          total > 0 ? (
            <Pagination
              page={Math.min(page, totalPages)}
              pageSize={RECIPES_PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              onPageChange={(next) => setPaging({ filterKey, page: next })}
            />
          ) : null
        }
      />
    </section>
  );
}
