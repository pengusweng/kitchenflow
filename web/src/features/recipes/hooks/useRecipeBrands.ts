"use client";

import { useQuery } from "@tanstack/react-query";
import type { BrandResponse } from "@/src/features/brands/schemas/brandSchema";
import { getBrands } from "@/src/features/brands/services/brands.service";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import { toRecipeBrand, unknownBrand } from "../utils/recipes";

// The API pages brands at most 100 at a time.
const PAGE = 100;
// A guard against a runaway loop, far above any real number of brands.
const MAX_PAGES = 20;

async function getAllBrands(): Promise<BrandResponse[]> {
  const first = await getBrands({ page: 1, limit: PAGE, status: "all" });
  const brands = [...first.data];
  const pages = Math.min(first.meta.totalPages, MAX_PAGES);
  for (let page = 2; page <= pages; page++) {
    brands.push(...(await getBrands({ page, limit: PAGE, status: "all" })).data);
  }
  return brands;
}

/**
 * Every brand, active or not, to name each recipe's brand and to filter by.
 * New recipes can only go to an active brand.
 */
export function useRecipeBrands() {
  const query = useQuery({
    queryKey: ["brands", "every"],
    queryFn: getAllBrands,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const records = query.data ?? [];
  const brands: MenuBrand[] = records.map(toRecipeBrand);
  const activeBrands = records.filter((b) => b.is_active).map(toRecipeBrand);
  const byId = new Map(brands.map((brand) => [brand.id, brand]));

  return {
    brands,
    activeBrands,
    brandFor: (id: string) => byId.get(id) ?? unknownBrand(id),
    isPending: query.isPending,
    error: query.error,
  };
}
