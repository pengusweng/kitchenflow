import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getBrands } from "../services/brands.service";
import type { BrandStatusFilter } from "../utils/brands";

export const BRANDS_PAGE_SIZE = 15;

type UseBrandsParams = { status: BrandStatusFilter; search: string; page: number };

// One request per page. The previous page stays in `data` (isPlaceholderData)
// until the requested one arrives, so counts and totals don't blank out.
export function useBrands({ status, search, page }: UseBrandsParams) {
  return useQuery({
    queryKey: ["brands", { status, search, page, limit: BRANDS_PAGE_SIZE }],
    queryFn: () => getBrands({ page, limit: BRANDS_PAGE_SIZE, status, search }),
    placeholderData: keepPreviousData,
    retry: false,
  });
}
