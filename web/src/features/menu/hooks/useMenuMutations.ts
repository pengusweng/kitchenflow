"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { MenuPage } from "../schemas/menuSchema";
import {
  createMenuItem,
  deactivateMenuItem,
  reactivateMenuItem,
  setMenuItemAvailability,
  updateMenuItem,
  uploadMenuPhoto,
} from "../services/menu.service";
import { patchAvailability, type MenuItem } from "../utils/menu";
import { toCreatePayload, toUpdatePayload, type MenuItemFormValues } from "../utils/menu-form";
import { menuKeys } from "./useMenu";

function useInvalidateMenu() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: menuKeys.all });
}

/** Uploads the photo, then adds the item with the key the upload returned. */
export function useCreateMenuItem() {
  const invalidate = useInvalidateMenu();
  return useMutation({
    mutationFn: async ({ brandId, values, photo }: { brandId: string; values: MenuItemFormValues; photo: File }) =>
      createMenuItem(toCreatePayload(brandId, values, await uploadMenuPhoto(photo))),
    onSuccess: () => invalidate(),
  });
}

/** Uploads a new photo when there is one, then sends only what changed. */
export function useUpdateMenuItem() {
  const invalidate = useInvalidateMenu();
  return useMutation({
    mutationFn: async ({ item, values, photo }: { item: MenuItem; values: MenuItemFormValues; photo: File | null }) =>
      updateMenuItem(item.id, toUpdatePayload(item, values, photo ? await uploadMenuPhoto(photo) : null)),
    onSuccess: () => invalidate(),
  });
}

export function useSetMenuItemActive() {
  const invalidate = useInvalidateMenu();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? reactivateMenuItem(id) : deactivateMenuItem(id),
    onSuccess: () => invalidate(),
  });
}

type PageSnapshot = [readonly unknown[], MenuPage | undefined][];

function patchCachedPages(queryClient: QueryClient, itemId: string, available: boolean) {
  const snapshot: PageSnapshot = queryClient.getQueriesData<MenuPage>({
    queryKey: menuKeys.lists,
  });
  // Pages that don't show the item may now be wrong (its count, or a page it
  // would now appear on), so they reload the next time they're shown.
  void queryClient.invalidateQueries({
    queryKey: menuKeys.lists,
    refetchType: "none",
    predicate: (query) => !(query.state.data as MenuPage | undefined)?.data.some((r) => r.menu_item_id === itemId),
  });
  for (const [key, page] of snapshot) {
    const next = page && patchAvailability(page, itemId, available);
    // Writing an untouched page would also clear its invalidation above.
    if (next && next !== page) queryClient.setQueryData<MenuPage>(key, next);
  }
  return snapshot;
}

/** Applied at once, and undone if the API refuses it. */
export function useSetMenuItemAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => setMenuItemAvailability(id, available),
    onMutate: async ({ id, available }) => {
      await queryClient.cancelQueries({ queryKey: menuKeys.lists });
      return { snapshot: patchCachedPages(queryClient, id, available) };
    },
    onError: (_error, _vars, context) => {
      for (const [key, page] of context?.snapshot ?? []) queryClient.setQueryData(key, page);
      // Someone else may have changed it; show where it really stands.
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
    },
  });
}
