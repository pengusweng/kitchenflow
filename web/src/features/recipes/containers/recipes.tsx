"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { MOCK_BRANDS } from "@/src/features/menu/utils/mock-menu";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { nextSort } from "@/src/lib/table-sort";
import RecipesFilterBar from "../components/organisms/recipes-filter-bar";
import RecipesTable from "../components/organisms/recipes-table";
import { useMockRecipes } from "../hooks/useMockRecipes";
import { filterRecipes, RECIPES_PAGE_SIZE, type RecipeSort, type RecipeStatusFilter } from "../utils/recipes";

const BRAND_CODES = MOCK_BRANDS.map((brand) => brand.code);

// Every brand by default, most recently updated first. Picking a brand narrows
// the table and the URL keeps it (?brand=GC), as on the menu page.
export default function RecipesPage({ canCreate }: { canCreate: boolean }) {
  // Placeholder data until the recipes API is wired up.
  const recipes = useMockRecipes();
  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand")?.toUpperCase();
  const brand = brandParam && BRAND_CODES.includes(brandParam) ? brandParam : undefined;

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RecipeStatusFilter | undefined>("active");
  const [sort, setSort] = useState<RecipeSort>(null);
  const search = useDebouncedValue(query.trim());

  // Any filter or sort change returns to page 1.
  const filterKey = `${brand ?? ""}|${status ?? ""}|${search}|${sort ? `${sort.by}:${sort.order}` : ""}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  function setBrand(code: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (code) params.set("brand", code);
    else params.delete("brand");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  const rows = filterRecipes(recipes, { search, brand, status }, sort);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / RECIPES_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * RECIPES_PAGE_SIZE, currentPage * RECIPES_PAGE_SIZE);

  const filtered = Boolean(query.trim() || brand || status !== "active");
  const emptyMessage = filtered ? "No recipes match these filters." : "No recipes yet.";

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
        brands={MOCK_BRANDS}
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
        recipes={pageRows}
        showBrand={!brand}
        sort={sort}
        onSort={(by) => setSort((current) => nextSort(current, by))}
        recipeHref={(recipe) => `/dashboard/recipes/${recipe.id}`}
        emptyMessage={emptyMessage}
        footer={
          total > 0 ? (
            <Pagination
              page={currentPage}
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
