import { ApiError } from "@/src/lib/api-error";

/** A failed save, and the form field it belongs to when there is one. */
export type MenuSaveError = {
  message: string;
  field?: "code" | "recipeId" | "photo";
};

/** What went wrong adding or saving a menu item, in the words the form shows. */
export function menuSaveError(error: unknown): MenuSaveError {
  if (!(error instanceof ApiError)) return { message: "Unable to save the item. Please try again." };
  switch (error.code) {
    case "DUPLICATE_RESOURCE":
      return {
        message: "Another menu item already uses this code.",
        field: "code",
      };
    case "RECIPE_NOT_FOUND":
      return {
        message: "This recipe is inactive or no longer exists. Choose another.",
        field: "recipeId",
      };
    case "ASSET_NOT_FOUND":
      return {
        message: "The photo didn't finish uploading. Choose it again.",
        field: "photo",
      };
    case "MODIFIER_NOT_FOUND":
    case "MODIFIER_INACTIVE":
      return {
        message: "One of these modifiers was retired or removed. Take it off the item and try again.",
      };
    case "MENU_ITEM_NOT_FOUND":
      return {
        message: "This item is inactive or no longer exists. Close this and reload the menu.",
      };
    case "DUPLICATE_ORDER_CHANNEL":
    case "MENU_ITEM_CHANNEL_NOT_FOUND":
    case "CONFLICTING_CHANNEL_MUTATIONS":
      return {
        message: "Someone else changed this item's delivery channels. Close this and reload the menu.",
      };
    case "DUPLICATE_MENU_ITEM_MODIFIER":
      return {
        message: "A modifier is on this item twice. Remove the extra one and try again.",
      };
  }
  if (error.status === 401) return { message: "Your session has expired. Sign in again to continue." };
  if (error.status === 403) return { message: "Only superadmins can add or edit menu items." };
  return { message: error.message };
}

/** Switching availability, or deactivating and reactivating. */
export function menuActionError(error: unknown, action: "availability" | "deactivate" | "reactivate"): string {
  const verb = action === "availability" ? "change availability for" : action;
  if (!(error instanceof ApiError)) return `Unable to ${verb} the item. Please try again.`;
  if (
    error.code === "AVAILABILITY_CONFLICT" ||
    error.code === "MENU_ITEM_ALREADY_ACTIVE" ||
    error.code === "MENU_ITEM_NOT_FOUND" ||
    error.code === "RESOURCE_NOT_FOUND"
  )
    return "Someone else changed this item. The menu has been reloaded.";
  if (error.status === 401) return "Your session has expired. Sign in again to continue.";
  if (error.status === 403)
    return action === "availability"
      ? "Your role can't change availability."
      : `Only superadmins can ${action} menu items.`;
  return error.message;
}
