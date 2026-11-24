import { ApiError } from "@/src/lib/api-error";
import { unitSchema, unitsPageSchema, type UnitResponse } from "../schemas/unitSchema";
import type { CreateUnitPayload } from "../utils/units";

/** The API caps a page at 100; a kitchen has a handful of units, so one page is all of them. */
const ALL_UNITS = 100;

export async function getUnits(signal?: AbortSignal): Promise<UnitResponse[]> {
  let response: Response;
  try {
    response = await fetch(`/api/units?limit=${ALL_UNITS}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response, "Unable to load units. Please try again.");
  const result = unitsPageSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) throw new Error("The server returned an invalid unit list.");
  return result.data.data;
}

export async function createUnit(payload: CreateUnitPayload): Promise<UnitResponse> {
  let response: Response;
  try {
    response = await fetch("/api/units", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response, "Unable to add the unit. Please try again.");
  const result = unitSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) throw new Error("The server returned an invalid unit.");
  return result.data;
}
