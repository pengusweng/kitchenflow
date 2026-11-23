"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { kitchenTicketListSchema } from "../schemas/kitchenTicketSchema";
import { getTicketsForDay, getTodayTickets, parse, TODAY_STREAM_URL } from "../services/kitchen-tickets.service";

export const kitchenTicketKeys = {
  today: ["kitchen-tickets", "today"] as const,
  day: (day: string) => ["kitchen-tickets", "day", day] as const,
  qc: (ticketId: string) => ["kitchen-tickets", "qc", ticketId] as const,
  handoff: (ticketId: string) => ["kitchen-tickets", "handoff", ticketId] as const,
};

/**
 * One day's tickets: today's when `day` is undefined, kept live, or an earlier
 * Asia/Manila day (YYYY-MM-DD).
 *
 * Today's first load is a plain request; after that the server's stream sends
 * the whole list again whenever any ticket changes, and each list replaces the
 * cached one. EventSource reconnects on its own after a drop, and the stream
 * sends the current list on every connect. Earlier days have no stream; they
 * rarely change, so they're refetched when the window comes back.
 */
export function useDayTickets(day: string | undefined) {
  const queryClient = useQueryClient();
  const live = day === undefined;

  useEffect(() => {
    if (!live) return;
    const source = new EventSource(TODAY_STREAM_URL);
    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const tickets = parse(kitchenTicketListSchema, JSON.parse(event.data));
        queryClient.setQueryData(kitchenTicketKeys.today, tickets);
        // A ticket's QC history can change with it; the open modal refetches it.
        void queryClient.invalidateQueries({ queryKey: ["kitchen-tickets", "qc"] });
      } catch {
        // A malformed event is skipped; the next change sends the full list again.
      }
    };
    return () => source.close();
  }, [live, queryClient]);

  return useQuery({
    queryKey: live ? kitchenTicketKeys.today : kitchenTicketKeys.day(day),
    queryFn: ({ signal }) => (live ? getTodayTickets(signal) : getTicketsForDay(day, signal)),
    // Today's stream keeps it fresh; refetch when the window comes back, in case the stream stalled.
    staleTime: live ? Infinity : 60_000,
    refetchOnWindowFocus: live ? "always" : true,
    retry: false,
  });
}
