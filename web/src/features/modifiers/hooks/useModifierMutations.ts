"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createModifier,
  deactivateModifier,
  reactivateModifier,
  updateModifier,
} from "../services/modifiers.service";
import type { ModifierPayload } from "../utils/modifier-form";
import { modifierKeys } from "./useModifiers";

// After any change the list, its counts and the open modifier are stale, so they all reload.
function useInvalidateModifiers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: modifierKeys.all });
}

export function useCreateModifier() {
  const invalidate = useInvalidateModifiers();
  return useMutation({
    mutationFn: (payload: ModifierPayload) => createModifier(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateModifier() {
  const invalidate = useInvalidateModifiers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModifierPayload }) =>
      updateModifier(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useSetModifierActive() {
  const invalidate = useInvalidateModifiers();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? reactivateModifier(id) : deactivateModifier(id),
    onSuccess: () => invalidate(),
  });
}
