import { ApiError } from "@/src/lib/api-error";

/** A failed save, and the form field it belongs to when there is one. */
export type ModifierSaveError = {
  message: string;
  field?: "code";
};

/** What went wrong adding or saving a modifier, in the words the form shows. */
export function modifierSaveError(error: unknown): ModifierSaveError {
  if (!(error instanceof ApiError))
    return { message: "Unable to save the modifier. Please try again." };
  if (error.code === "DUPLICATE_RESOURCE")
    return {
      message: "Another modifier already uses this code.",
      field: "code",
    };
  if (
    error.code === "MODIFIER_NOT_FOUND" ||
    error.code === "RESOURCE_NOT_FOUND"
  )
    return { message: "This modifier is inactive or no longer exists." };
  if (error.status === 401)
    return { message: "Your session has expired. Sign in again to continue." };
  if (error.status === 403)
    return {
      message: "Only recipe managers and superadmins can change modifiers.",
    };
  return { message: error.message };
}

/** Deactivating or reactivating. */
export function modifierStatusError(
  error: unknown,
  action: "deactivate" | "reactivate",
): string {
  if (!(error instanceof ApiError))
    return `Unable to ${action} the modifier. Please try again.`;
  if (
    error.code === "MODIFIER_NOT_FOUND" ||
    error.code === "RESOURCE_NOT_FOUND" ||
    error.code === "MODIFIER_ALREADY_ACTIVE"
  )
    return `This modifier is already ${action === "deactivate" ? "inactive" : "active"} or no longer exists. Reload to see where it stands.`;
  if (error.status === 401)
    return "Your session has expired. Sign in again to continue.";
  if (error.status === 403)
    return `Only recipe managers and superadmins can ${action} modifiers.`;
  return error.message;
}
