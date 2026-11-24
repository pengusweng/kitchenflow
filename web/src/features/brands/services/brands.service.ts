import { ApiError } from "@/src/lib/api-error";
import type { BrandFormInput, UpdateBrandInput } from "../schemas/brandFormSchema";
import { brandSchema, brandsPageSchema, type BrandResponse, type BrandsPage } from "../schemas/brandSchema";
import type { BrandStatusFilter } from "../utils/brands";

export type GetBrandsParams = {
  page: number;
  limit: number;
  status: BrandStatusFilter;
  search?: string;
};

export async function getBrands({ page, limit, status, search }: GetBrandsParams): Promise<BrandsPage> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), status });
  if (search) params.set("search", search);

  let response: Response;
  try {
    response = await fetch(`/api/brands?${params}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Unable to reach the server. Please try again.");
  }

  if (response.status === 401) throw new Error("Your session has expired. Please sign in again.");
  if (response.status === 403) throw new Error("You don't have permission to view brands.");
  if (!response.ok) throw new Error("Unable to load brands. Please try again.");

  const result = brandsPageSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) throw new Error("The server returned an invalid brand list.");
  return result.data;
}

/** Only finds active brands; its logo_url is a display URL. */
export async function getBrand(brandId: string): Promise<BrandResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/brands/${encodeURIComponent(brandId)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response, "Unable to load the brand. Please try again.");
  return parseBrand(response);
}

// A logo goes up as multipart/form-data in the same request; without one the
// body is plain JSON. Uploads get longer than the usual 10 s.
function brandBody(
  fields: Record<string, string | null | undefined>,
  logo: File | null,
): { body: BodyInit; headers: Record<string, string>; timeout: number } {
  if (!logo) {
    return { body: JSON.stringify(fields), headers: { "Content-Type": "application/json" }, timeout: 10_000 };
  }
  const form = new FormData();
  // A new file replaces the logo, so a logo_url: null alongside it is moot.
  for (const [key, value] of Object.entries(fields)) if (typeof value === "string") form.set(key, value);
  form.set("file", logo);
  // No Content-Type: the browser adds the multipart boundary itself.
  return { body: form, headers: {}, timeout: 30_000 };
}

export async function createBrand(input: BrandFormInput, logo: File | null, pin: string): Promise<BrandResponse> {
  const { body, headers, timeout } = brandBody(input, logo);
  let response: Response;
  try {
    response = await fetch("/api/brands", {
      method: "POST",
      headers: { ...headers, Accept: "application/json", "X-Action-Pin": pin },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response, "Unable to create the brand. Please try again.");
  return parseBrand(response);
}

// PATCH /api/brands/:id is PIN-protected. Send only the fields that changed.
export async function updateBrand(
  brandId: string,
  input: UpdateBrandInput,
  logo: File | null,
  pin: string,
): Promise<BrandResponse> {
  const { body, headers, timeout } = brandBody(input, logo);
  let response: Response;
  try {
    response = await fetch(`/api/brands/${encodeURIComponent(brandId)}`, {
      method: "PATCH",
      headers: { ...headers, Accept: "application/json", "X-Action-Pin": pin },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response, "Unable to save the changes. Please try again.");
  return parseBrand(response);
}

export async function deactivateBrand(brandId: string, pin: string): Promise<BrandResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/brands/${encodeURIComponent(brandId)}`, {
      method: "DELETE",
      headers: { Accept: "application/json", "X-Action-Pin": pin },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response, "Unable to deactivate the brand. Please try again.");
  return parseBrand(response);
}

async function parseBrand(response: Response): Promise<BrandResponse> {
  const result = brandSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) throw new ApiError(response.status, undefined, "The server returned an invalid brand.");
  return result.data;
}
