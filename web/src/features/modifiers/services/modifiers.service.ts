import { z } from "zod";
import { ApiError } from "@/src/lib/api-error";
import { modifierDetailSchema, modifierRecordSchema, modifiersPageSchema } from "../schemas/modifierSchema";
import type { ModifierPayload } from "../utils/modifier-form";
import type { ModifierSortField, StatusFilter } from "../utils/modifiers";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Shown when the API sends no message of its own. */
  fallback: string;
  signal?: AbortSignal;
};

// Every modifier call: JSON in and out, a 10 s limit, ApiError on failure, and
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

export type GetModifiersParams = {
  page: number;
  limit: number;
  status: StatusFilter | "all";
  search?: string;
  brandId?: string;
  sortBy: ModifierSortField;
  sortOrder: "asc" | "desc";
};

export function getModifiers(params: GetModifiersParams, signal?: AbortSignal) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    status: params.status,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  if (params.search) query.set("search", params.search);
  if (params.brandId) query.set("brand_id", params.brandId);
  return request(`/modifiers?${query}`, modifiersPageSchema, {
    fallback: "Unable to load modifiers. Please try again.",
    signal,
  });
}

const modifierPath = (id: string) => encodeURIComponent(id);

/** Active or not, with the menu items that offer it. */
export function getModifier(id: string, signal?: AbortSignal) {
  return request(`/modifiers/${modifierPath(id)}?activeOnly=false`, modifierDetailSchema, {
    fallback: "Unable to load the modifier. Please try again.",
    signal,
  });
}

export function createModifier(payload: ModifierPayload) {
  return request("/modifiers", modifierRecordSchema, {
    method: "POST",
    body: payload,
    fallback: "Unable to add the modifier. Please try again.",
  });
}

export function updateModifier(id: string, payload: ModifierPayload) {
  return request(`/modifiers/${modifierPath(id)}`, modifierRecordSchema, {
    method: "PATCH",
    body: payload,
    fallback: "Unable to save the changes. Please try again.",
  });
}

export function deactivateModifier(id: string) {
  return request(`/modifiers/${modifierPath(id)}`, modifierRecordSchema, {
    method: "DELETE",
    fallback: "Unable to deactivate the modifier. Please try again.",
  });
}

export function reactivateModifier(id: string) {
  return request(`/modifiers/reactivate/${modifierPath(id)}`, modifierRecordSchema, {
    method: "PATCH",
    fallback: "Unable to reactivate the modifier. Please try again.",
  });
}
