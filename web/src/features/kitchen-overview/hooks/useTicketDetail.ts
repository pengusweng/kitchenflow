"use client";

import { useQuery } from "@tanstack/react-query";
import { getHandoffPhotos, getQcHistory } from "../services/kitchen-tickets.service";
import { toQcAttempts } from "../utils/ticket-records";
import { hasQcHistory, showsHandoffPhotos, type KitchenTicket } from "../utils/tickets";
import { kitchenTicketKeys } from "./useTodayTickets";

/** The open ticket's QC history; off when no ticket is open or it hasn't been through QC. */
export function useQcHistory(ticket: KitchenTicket | null) {
  const enabled = ticket !== null && hasQcHistory(ticket);
  return useQuery({
    queryKey: kitchenTicketKeys.qc(ticket?.id ?? ""),
    queryFn: async ({ signal }) => toQcAttempts(await getQcHistory(ticket?.id ?? "", signal)),
    enabled,
    retry: false,
  });
}

/**
 * The open ticket's handoff photos, for handed-over delivery tickets only. The
 * URLs are signed and expire, so every opening of the ticket asks for fresh
 * ones (a photo that failed to load gets a new URL on reopen), and unused ones
 * are dropped after a few minutes.
 */
export function useHandoffPhotos(ticket: KitchenTicket | null) {
  const enabled = ticket !== null && showsHandoffPhotos(ticket);
  return useQuery({
    queryKey: kitchenTicketKeys.handoff(ticket?.id ?? ""),
    queryFn: ({ signal }) => getHandoffPhotos(ticket?.id ?? "", signal),
    enabled,
    gcTime: 5 * 60_000,
    retry: false,
  });
}
