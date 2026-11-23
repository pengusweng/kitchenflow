import { z } from "zod";
import { ApiError } from "@/src/lib/api-error";
import { handoffSchema, kitchenTicketListSchema, qcHistorySchema } from "../schemas/kitchenTicketSchema";

/** Server-sent events: the full list of today's tickets on connect and after every change. */
export const TODAY_STREAM_URL = "/api/kitchen-ticket/today/stream";

// Every kitchen ticket call: JSON out, a 10 s limit, ApiError on failure, and
// the response checked against its schema before anything renders it.
async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  fallback: string,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  const timeout = AbortSignal.timeout(10_000);
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw ApiError.network();
  }

  if (!response.ok) throw await ApiError.fromResponse(response, fallback);
  return parse(schema, await response.json().catch(() => null), response.status);
}

/** Checks a payload against its schema; also used for each event of the live stream. */
export function parse<S extends z.ZodType>(schema: S, data: unknown, status = 200): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(status, undefined, "The server sent something unexpected. Please try again.");
  return result.data;
}

/** Every ticket created today (Asia/Manila), open or not. */
export function getTodayTickets(signal?: AbortSignal) {
  return request("/kitchen-ticket/today", kitchenTicketListSchema, "Unable to load kitchen tickets.", signal);
}

/** Every ticket created on one Asia/Manila day (YYYY-MM-DD), open or not. */
export function getTicketsForDay(day: string, signal?: AbortSignal) {
  return request(
    `/kitchen-ticket/date/${encodeURIComponent(day)}`,
    kitchenTicketListSchema,
    "Unable to load that day's kitchen tickets.",
    signal,
  );
}

/** Every QC attempt on a ticket, newest first, with its checker and rejected portions. */
export function getQcHistory(ticketId: string, signal?: AbortSignal) {
  return request(
    `/kitchen-qc/ticket/${encodeURIComponent(ticketId)}`,
    qcHistorySchema,
    "Unable to load the QC history.",
    signal,
  );
}

/** Signed URLs of a ticket's handoff photos; none when it was handed over without a handoff record. */
export async function getHandoffPhotos(ticketId: string, signal?: AbortSignal): Promise<string[]> {
  try {
    const handoff = await request(
      `/handoff/kitchen-ticket/${encodeURIComponent(ticketId)}`,
      handoffSchema,
      "Unable to load the handoff photos.",
      signal,
    );
    return handoff.img_urls;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    throw error;
  }
}
