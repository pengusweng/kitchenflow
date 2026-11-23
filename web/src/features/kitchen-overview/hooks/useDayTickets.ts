"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { kitchenTicketListSchema } from "../schemas/kitchenTicketSchema";
import { getTodayTickets, parse, TODAY_STREAM_URL } from "../services/kitchen-tickets.service";

export const kitchenTicketKeys = {
  today: ["kitchen-tickets", "today"] as const,
  qc: (ticketId: string) => ["kitchen-tickets", "qc", ticketId] as const,
  handoff: (ticketId: string) => ["kitchen-tickets", "handoff", ticketId] as const,
};

/**
 * Today's tickets, kept live. The first load is a plain request; after that the
 * server's stream sends the whole list again whenever any ticket changes, and
 * each list replaces the cached one. EventSource reconnects on its own after a
 * drop, and the stream sends the current list on every connect.
 */
export function useTodayTickets() {
  const queryClient = useQueryClient();

  useEffect(() => {
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
  }, [queryClient]);

  return useQuery({
    queryKey: kitchenTicketKeys.today,
    queryFn: ({ signal }) => getTodayTickets(signal),
    // The stream keeps it fresh; refetch only when the window comes back, in case the stream stalled.
    staleTime: Infinity,
    refetchOnWindowFocus: "always",
    retry: false,
  });
}
