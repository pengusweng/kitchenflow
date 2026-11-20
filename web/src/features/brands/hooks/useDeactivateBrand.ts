import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePin } from "@/src/features/pin/hooks/usePin";
import { ApiError } from "@/src/lib/api-error";
import { deactivateBrand } from "../services/brands.service";
import { toBrand, type Brand } from "../utils/brands";

function deactivateErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Unable to deactivate the brand. Please try again.";
  if (error.code === "BRAND_NOT_FOUND" || error.code === "RESOURCE_NOT_FOUND")
    return "This brand is already inactive or no longer exists.";
  if (error.status === 401) return "Your session has expired. Sign in again to continue.";
  return error.message;
}

export function useDeactivateBrand(onDeactivated: (brand: Brand) => void) {
  const { withPin } = usePin();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (brand: Brand) =>
      withPin((pin) => deactivateBrand(brand.id, pin), {
        title: "Deactivate brand",
        description: `Enter your PIN to deactivate ${brand.name}. Its menu items and recipes are deactivated with it.`,
      }),
    onSuccess: async (saved, brand) => {
      if (!saved) return; // PIN prompt cancelled
      await queryClient.invalidateQueries({ queryKey: ["brands"] }); // refreshes the table and the counts
      // Keep the logo already on screen: the response only has its stored key.
      onDeactivated({ ...toBrand(saved), logoUrl: brand.logoUrl });
    },
  });

  return {
    deactivate: mutation.mutate,
    pending: mutation.isPending,
    error: mutation.error ? deactivateErrorMessage(mutation.error) : null,
    resetError: mutation.reset,
  };
}
