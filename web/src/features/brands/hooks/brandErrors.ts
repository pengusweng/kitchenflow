import { ApiError } from "@/src/lib/api-error";

/** Messages for the ways creating or saving a brand can fail. */
export function saveBrandErrorMessage(error: unknown, code: string | undefined, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "DUPLICATE_RESOURCE") return `The code "${code}" is already used by another brand. Choose another.`;
  if (error.code === "BRAND_NOT_FOUND" || error.code === "RESOURCE_NOT_FOUND")
    return "This brand is inactive or no longer exists.";
  if (error.status === 413) return "That image is too large. Logos can be up to 5 MB.";
  if (error.status === 415) return "That image can't be used. Choose a still JPG or PNG up to 20 megapixels.";
  if (error.status === 503) return "Logo uploads are unavailable right now. Try again, or save without a logo.";
  if (error.status === 401) return "Your session has expired. Sign in again to continue.";
  if (error.status === 403) return "You don't have permission to manage brands.";
  return error.message;
}
