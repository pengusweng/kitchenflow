"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { WebRole } from "@/src/features/auth/utils/webRoles";
import { getBrands } from "@/src/features/brands/services/brands.service";
import { useDayTickets, type KitchenStreamStatus } from "@/src/features/kitchen-overview/hooks/useDayTickets";
import { useNow } from "@/src/features/kitchen-overview/hooks/useNow";
import { toKitchenTickets } from "@/src/features/kitchen-overview/utils/ticket-records";
import type { KitchenTicket } from "@/src/features/kitchen-overview/utils/tickets";
import { getMenu } from "@/src/features/menu/services/menu.service";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import { useTodayInManila } from "@/src/features/orders/hooks/useTodayInManila";
import { getOrders } from "@/src/features/orders/services/orders.service";
import { getRecipes } from "@/src/features/recipes/services/recipes.service";
import { toRecipe, unknownBrand, type Recipe } from "@/src/features/recipes/utils/recipes";
import {
  isKitchenWorkspaceRole,
  isOrderWorkspaceRole,
  isRecipeWorkspaceRole,
  summarizeBrandOperations,
  summarizeKitchenActivity,
  toWorkspaceBrands,
  type BrandOperationRow,
  type KitchenActivitySummary,
  type WorkspaceBrand,
} from "../utils/workspace";

export type MetricValue<T> = {
  value: T | null;
  isLoading: boolean;
  isError: boolean;
};

export type BrandRecipeRow = {
  brand: WorkspaceBrand;
  active: number | null;
  inactive: number | null;
  isLoading: boolean;
  isError: boolean;
};

export type WorkspaceData = {
  today: string | undefined;
  now: number | undefined;
  brandsLoading: boolean;
  brandsError: string | null;
  orders: {
    total: MetricValue<number>;
    paid: MetricValue<number>;
    unpaid: MetricValue<number>;
  };
  unavailableItems: MetricValue<number>;
  kitchen: {
    isLoading: boolean;
    error: string | null;
    streamStatus: KitchenStreamStatus;
    summary: KitchenActivitySummary | null;
  };
  brandOperations: BrandOperationRow[];
  recipes: {
    total: MetricValue<number>;
    active: MetricValue<number>;
    inactive: MetricValue<number>;
    recent: Recipe[];
    recentLoading: boolean;
    recentError: string | null;
    byBrand: BrandRecipeRow[];
  };
  lastUpdatedAt: number | null;
  isRefreshing: boolean;
  refreshAll: () => void;
};

function errorMessage(error: unknown, fallback: string): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : fallback;
}

export function useWorkspaceData(role: WebRole): WorkspaceData {
  const now = useNow();
  // Deriving the Manila calendar date from the live 1s clock rolls midnight over automatically.
  const today = useTodayInManila();

  const canSeeOrders = isOrderWorkspaceRole(role);
  const canSeeKitchen = isKitchenWorkspaceRole(role);
  const isRecipeManager = isRecipeWorkspaceRole(role);

  const brandsQuery = useQuery({
    queryKey: ["workspace", "brands"],
    queryFn: () => getBrands({ page: 1, limit: 100, status: "all" }),
    retry: false,
  });

  const brands = useMemo(
    () => (brandsQuery.data ? toWorkspaceBrands(brandsQuery.data.data) : []),
    [brandsQuery.data],
  );

  const brandMap = useMemo(() => {
    const map = new Map<string, MenuBrand>();
    for (const b of brands) {
      map.set(b.id, { id: b.id, code: b.code, name: b.name, accent: b.accent });
    }
    return map;
  }, [brands]);

  const brandFor = useCallback(
    (id: string): MenuBrand => brandMap.get(id) ?? unknownBrand(id),
    [brandMap],
  );

  // Order totals for today in Asia/Manila (SUPERADMIN & SUPERVISOR only)
  const ordersReady = canSeeOrders && today !== undefined;
  const totalOrdersQuery = useQuery({
    queryKey: ["workspace", "orders", "total", today],
    queryFn: () => getOrders({ page: 1, limit: 1, from: today, to: today }),
    enabled: ordersReady,
    retry: false,
  });
  const paidOrdersQuery = useQuery({
    queryKey: ["workspace", "orders", "paid", today],
    queryFn: () => getOrders({ page: 1, limit: 1, from: today, to: today, payment: "PAID" }),
    enabled: ordersReady,
    retry: false,
  });
  const unpaidOrdersQuery = useQuery({
    queryKey: ["workspace", "orders", "unpaid", today],
    queryFn: () => getOrders({ page: 1, limit: 1, from: today, to: today, payment: "UNPAID" }),
    enabled: ordersReady,
    retry: false,
  });

  // Live SSE ticket stream for today (SUPERADMIN, SUPERVISOR, KITCHEN_HEAD)
  const dayTickets = useDayTickets(undefined, canSeeKitchen);

  // Current menu availability summary (SUPERADMIN, SUPERVISOR, KITCHEN_HEAD)
  const menuCountsQuery = useQuery({
    queryKey: ["workspace", "menu-counts"],
    queryFn: ({ signal }) => getMenu({ page: 1, limit: 1, status: "active", availability: "all" }, signal),
    enabled: canSeeKitchen,
    retry: false,
  });

  const kitchenTickets: KitchenTicket[] | undefined = useMemo(() => {
    if (!dayTickets.data) return undefined;
    return toKitchenTickets(dayTickets.data, brandFor);
  }, [dayTickets.data, brandFor]);

  const kitchenSummary = useMemo(() => {
    if (!kitchenTickets) return null;
    return summarizeKitchenActivity(kitchenTickets, now ?? 0);
  }, [kitchenTickets, now]);

  const brandOperations = useMemo(
    () =>
      summarizeBrandOperations({
        brands,
        tickets: kitchenTickets,
        menuBrandCounts: menuCountsQuery.data?.meta.counts.brands,
      }),
    [brands, kitchenTickets, menuCountsQuery.data],
  );

  // Recipe overview (RECIPE_MANAGER only)
  const recentRecipesQuery = useQuery({
    queryKey: ["workspace", "recipes", "recent"],
    queryFn: ({ signal }) =>
      getRecipes({ page: 1, limit: 5, status: "all", sortBy: "modified_at", sortOrder: "desc" }, signal),
    enabled: isRecipeManager,
    retry: false,
  });

  const brandRecipeQueries = useQueries({
    queries: (isRecipeManager ? brands : []).map((brand) => ({
      queryKey: ["workspace", "recipes", "brand-count", brand.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getRecipes({ page: 1, limit: 1, status: "all", brandId: brand.id, sortBy: "modified_at", sortOrder: "desc" }, signal),
      retry: false,
    })),
  });

  const recentRecipes = useMemo(() => {
    if (!recentRecipesQuery.data) return [];
    return recentRecipesQuery.data.data.map((record) => toRecipe(record, brandFor(record.brand_id)));
  }, [recentRecipesQuery.data, brandFor]);

  const recipesByBrand: BrandRecipeRow[] = useMemo(() => {
    if (!isRecipeManager) return [];
    return brands.map((brand, idx) => {
      const q = brandRecipeQueries[idx];
      return {
        brand,
        active: q?.data ? q.data.meta.counts.active : null,
        inactive: q?.data ? q.data.meta.counts.inactive : null,
        isLoading: Boolean(q?.isPending),
        isError: Boolean(q?.isError),
      };
    });
  }, [isRecipeManager, brands, brandRecipeQueries]);

  const refreshAll = useCallback(() => {
    void brandsQuery.refetch();
    if (canSeeOrders && today !== undefined) {
      void totalOrdersQuery.refetch();
      void paidOrdersQuery.refetch();
      void unpaidOrdersQuery.refetch();
    }
    if (canSeeKitchen) {
      dayTickets.retryToday();
      void menuCountsQuery.refetch();
    }
    if (isRecipeManager) {
      void recentRecipesQuery.refetch();
      for (const q of brandRecipeQueries) {
        void q.refetch();
      }
    }
  }, [
    brandsQuery,
    canSeeOrders,
    today,
    totalOrdersQuery,
    paidOrdersQuery,
    unpaidOrdersQuery,
    canSeeKitchen,
    dayTickets,
    menuCountsQuery,
    isRecipeManager,
    recentRecipesQuery,
    brandRecipeQueries,
  ]);

  const updatedTimestamps = [
    brandsQuery.dataUpdatedAt,
    canSeeOrders ? totalOrdersQuery.dataUpdatedAt : 0,
    canSeeOrders ? paidOrdersQuery.dataUpdatedAt : 0,
    canSeeOrders ? unpaidOrdersQuery.dataUpdatedAt : 0,
    canSeeKitchen ? dayTickets.dataUpdatedAt : 0,
    canSeeKitchen ? menuCountsQuery.dataUpdatedAt : 0,
    isRecipeManager ? recentRecipesQuery.dataUpdatedAt : 0,
    ...brandRecipeQueries.map((query) => query.dataUpdatedAt),
  ].filter((t) => t > 0);

  const lastUpdatedAt = updatedTimestamps.length > 0 ? Math.max(...updatedTimestamps) : null;

  const isRefreshing =
    brandsQuery.isFetching ||
    (canSeeOrders && (totalOrdersQuery.isFetching || paidOrdersQuery.isFetching || unpaidOrdersQuery.isFetching)) ||
    (canSeeKitchen && (dayTickets.isFetching || menuCountsQuery.isFetching)) ||
    (isRecipeManager && (recentRecipesQuery.isFetching || brandRecipeQueries.some((q) => q.isFetching)));

  return {
    today,
    now,
    brandsLoading: brandsQuery.isPending,
    brandsError: errorMessage(brandsQuery.error, "Unable to load brands."),
    orders: {
      total: {
        value: totalOrdersQuery.data ? totalOrdersQuery.data.meta.total : null,
        isLoading: canSeeOrders && (today === undefined || totalOrdersQuery.isPending),
        isError: totalOrdersQuery.isError,
      },
      paid: {
        value: paidOrdersQuery.data ? paidOrdersQuery.data.meta.total : null,
        isLoading: canSeeOrders && (today === undefined || paidOrdersQuery.isPending),
        isError: paidOrdersQuery.isError,
      },
      unpaid: {
        value: unpaidOrdersQuery.data ? unpaidOrdersQuery.data.meta.total : null,
        isLoading: canSeeOrders && (today === undefined || unpaidOrdersQuery.isPending),
        isError: unpaidOrdersQuery.isError,
      },
    },
    unavailableItems: {
      value: menuCountsQuery.data ? menuCountsQuery.data.meta.counts.availability.unavailable : null,
      isLoading: canSeeKitchen && menuCountsQuery.isPending,
      isError: menuCountsQuery.isError,
    },
    kitchen: {
      isLoading: canSeeKitchen && dayTickets.isPending,
      error: errorMessage(dayTickets.error, "Unable to load today's kitchen tickets."),
      streamStatus: dayTickets.streamStatus,
      summary: kitchenSummary,
    },
    brandOperations,
    recipes: {
      total: {
        value: recentRecipesQuery.data ? recentRecipesQuery.data.meta.counts.all : null,
        isLoading: isRecipeManager && recentRecipesQuery.isPending,
        isError: recentRecipesQuery.isError,
      },
      active: {
        value: recentRecipesQuery.data ? recentRecipesQuery.data.meta.counts.active : null,
        isLoading: isRecipeManager && recentRecipesQuery.isPending,
        isError: recentRecipesQuery.isError,
      },
      inactive: {
        value: recentRecipesQuery.data ? recentRecipesQuery.data.meta.counts.inactive : null,
        isLoading: isRecipeManager && recentRecipesQuery.isPending,
        isError: recentRecipesQuery.isError,
      },
      recent: recentRecipes,
      recentLoading: isRecipeManager && recentRecipesQuery.isPending,
      recentError: errorMessage(recentRecipesQuery.error, "Unable to load recipes."),
      byBrand: recipesByBrand,
    },
    lastUpdatedAt,
    isRefreshing,
    refreshAll,
  };
}
