"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getModifier,
  getModifiers,
  type GetModifiersParams,
} from "../services/modifiers.service";

export const modifierKeys = {
  all: ["modifiers"] as const,
  list: (params: GetModifiersParams) => ["modifiers", "list", params] as const,
  one: (id: string) => ["modifiers", "one", id] as const,
};

/** One page of the modifiers table. The previous page stays shown (isPlaceholderData) until the next arrives. */
export function useModifiers(params: GetModifiersParams, enabled = true) {
  return useQuery({
    queryKey: modifierKeys.list(params),
    queryFn: ({ signal }) => getModifiers(params, signal),
    placeholderData: keepPreviousData,
    enabled,
    retry: false,
  });
}

/** One modifier with the menu items that offer it; off while no modifier is open. */
export function useModifier(id: string | null) {
  return useQuery({
    queryKey: modifierKeys.one(id ?? ""),
    queryFn: ({ signal }) => getModifier(id ?? "", signal),
    enabled: id !== null,
    retry: false,
  });
}
