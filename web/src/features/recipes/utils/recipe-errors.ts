import { ApiError } from "@/src/lib/api-error";

/** A failed save, and the form field it belongs to when there is one. */
export type RecipeSaveError = {
  message: string;
  field?: "code";
  /** "info" for a nudge, such as nothing to save, rather than a failure. */
  tone?: "info";
};

/** What went wrong adding or saving a recipe, in the words the form shows. */
export function recipeSaveError(error: unknown): RecipeSaveError {
  if (!(error instanceof ApiError)) return { message: "Unable to save the recipe. Please try again." };
  switch (error.code) {
    case "DUPLICATE_RESOURCE":
      return { message: "Another recipe already uses this code.", field: "code" };
    case "DUPLICATE_INGREDIENT_NAME":
      return { message: "Two ingredients have the same name. Give each one its own name." };
    case "NON_EXISTING_UNIT":
      return { message: "One of the units no longer exists. Pick another unit and try again." };
    case "NO_RECIPE_CHANGES":
      return { message: "Nothing has changed yet.", tone: "info" };
    case "RECIPE_NOT_FOUND":
    case "RESOURCE_NOT_FOUND":
      return { message: "This recipe is inactive or no longer exists." };
    case "BRAND_NOT_FOUND":
      return { message: "That brand is inactive or no longer exists. Choose another brand." };
  }
  if (error.status === 401) return { message: "Your session has expired. Sign in again to continue." };
  if (error.status === 403) return { message: "Only recipe managers and superadmins can change recipes." };
  return { message: error.message };
}

/** Deactivating or reactivating. */
export function recipeStatusError(error: unknown, action: "deactivate" | "reactivate"): string {
  if (!(error instanceof ApiError)) return `Unable to ${action} the recipe. Please try again.`;
  if (error.code === "RECIPE_NOT_FOUND" || error.code === "RESOURCE_NOT_FOUND")
    return `This recipe is already ${action === "deactivate" ? "inactive" : "active"} or no longer exists. Reload to see where it stands.`;
  if (error.status === 401) return "Your session has expired. Sign in again to continue.";
  if (error.status === 403) return `Only recipe managers and superadmins can ${action} recipes.`;
  return error.message;
}

/** Whether a query failed because the thing isn't there, rather than failing to load. */
export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;
