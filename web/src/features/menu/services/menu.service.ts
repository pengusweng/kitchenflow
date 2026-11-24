import { z } from "zod";
import { ApiError } from "@/src/lib/api-error";
import { menuEntrySchema, menuItemStatusSchema, menuPageSchema, uploadSchema } from "../schemas/menuSchema";
import type { ActiveFilter, AvailabilityFilter } from "../utils/menu";
import type { CreateMenuItemPayload, UpdateMenuItemPayload } from "../utils/menu-form";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Shown when the API sends no message of its own. */
  fallback: string;
  signal?: AbortSignal;
};

// Every menu call: JSON in and out, a 10 s limit, ApiError on failure, and
// the response checked against its schema before anything renders it.
async function request<S extends z.ZodType>(path: string, schema: S, options: RequestOptions): Promise<z.infer<S>> {
  const { method = "GET", body, fallback, signal } = options;
  const timeout = AbortSignal.timeout(10_000);
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response, fallback);
  const result = schema.safeParse(await response.json().catch(() => null));
  if (!result.success)
    throw new ApiError(response.status, undefined, "The server sent something unexpected. Please try again.");
  return result.data;
}

export type GetMenuParams = {
  page: number;
  limit: number;
  /** Undefined lists active and inactive items together. */
  status: ActiveFilter | undefined;
  availability: AvailabilityFilter;
  brandId?: string;
  search?: string;
};

/** Every brand's menu, one page at a time, with counts for the filter chips. */
export function getMenu(params: GetMenuParams, signal?: AbortSignal) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    status: params.status ?? "all",
    availability: params.availability,
  });
  if (params.brandId) query.set("brand_id", params.brandId);
  if (params.search) query.set("search", params.search);
  return request(`/menu-catalog?${query}`, menuPageSchema, {
    fallback: "Unable to load the menu. Please try again.",
    signal,
  });
}

const itemPath = (id: string) => encodeURIComponent(id);

export function createMenuItem(payload: CreateMenuItemPayload) {
  return request("/menu-catalog", menuEntrySchema, {
    method: "POST",
    body: payload,
    fallback: "Unable to add the item. Please try again.",
  });
}

export function updateMenuItem(id: string, payload: UpdateMenuItemPayload) {
  return request(`/menu-catalog/${itemPath(id)}`, menuEntrySchema, {
    method: "PATCH",
    body: payload,
    fallback: "Unable to save the item. Please try again.",
  });
}

export function setMenuItemAvailability(id: string, available: boolean) {
  return request(`/menu-items/availability/${itemPath(id)}`, menuItemStatusSchema, {
    method: "PATCH",
    body: { availability: available },
    fallback: "Unable to change availability. Please try again.",
  });
}

/** Takes the item off the menu; its history stays. */
export function deactivateMenuItem(id: string) {
  return request(`/menu-items/${itemPath(id)}`, menuItemStatusSchema, {
    method: "DELETE",
    fallback: "Unable to deactivate the item. Please try again.",
  });
}

export function reactivateMenuItem(id: string) {
  return request(`/menu-items/reactivate/${itemPath(id)}`, menuItemStatusSchema, {
    method: "PATCH",
    fallback: "Unable to reactivate the item. Please try again.",
  });
}

/** Stores a photo and returns the key to save as the item's img_url. */
export async function uploadMenuPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  let response: Response;
  try {
    // No Content-Type: the browser adds the multipart boundary itself.
    response = await fetch("/api/assets", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw ApiError.network();
  }
  if (!response.ok) throw await ApiError.fromResponse(response, "Unable to upload the photo. Please try again.");
  const result = uploadSchema.safeParse(await response.json().catch(() => null));
  if (!result.success)
    throw new ApiError(response.status, undefined, "The server sent something unexpected. Please try again.");
  return result.data.key;
}
