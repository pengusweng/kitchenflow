"use client";

import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { todayInManila } from "@/src/features/audit-history/utils/audit";
import { useTodayInManila } from "@/src/features/orders/hooks/useTodayInManila";
import { kitchenTicketListSchema } from "../schemas/kitchenTicketSchema";
import { getTicketsForDay, parse, TODAY_STREAM_URL } from "../services/kitchen-tickets.service";

export type KitchenStreamStatus = "idle" | "connecting" | "live" | "reconnecting" | "disconnected";

export const kitchenTicketKeys = {
  today: (date: string | undefined) => ["kitchen-tickets", "today", date] as const,
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
export function useDayTickets(day: string | undefined, enabled = true) {
  const queryClient = useQueryClient();
  const today = useTodayInManila();
  const queryDate = day ?? today;
  const liveDate = enabled && day === undefined ? today : undefined;
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [streamState, setStreamState] = useState<{
    date: string;
    attempt: number;
    status: KitchenStreamStatus;
  }>();

  useEffect(() => {
    if (!liveDate) return;
    const queryKey = kitchenTicketKeys.today(liveDate);
    const source = new EventSource(TODAY_STREAM_URL);
    let current = true;
    source.onmessage = (event: MessageEvent<string>) => {
      if (!current || todayInManila() !== liveDate) return;
      try {
        const tickets = parse(kitchenTicketListSchema, JSON.parse(event.data));
        if (tickets.some(({ created_at }) => todayInManila(new Date(created_at)) !== liveDate)) return;
        // The full stream snapshot takes precedence over an in-flight HTTP read.
        void queryClient.cancelQueries({ queryKey, exact: true });
        queryClient.setQueryData(queryKey, tickets);
        setStreamState({ date: liveDate, attempt: connectionAttempt, status: "live" });
        // A ticket's QC history can change with it; the open modal refetches it.
        void queryClient.invalidateQueries({ queryKey: ["kitchen-tickets", "qc"] });
      } catch {
        // A malformed event is skipped; the next change sends the full list again.
      }
    };
    source.onerror = () => {
      if (!current || todayInManila() !== liveDate) return;
      setStreamState({
        date: liveDate,
        attempt: connectionAttempt,
        status: source.readyState === EventSource.CONNECTING ? "reconnecting" : "disconnected",
      });
    };
    return () => {
      current = false;
      source.close();
    };
  }, [liveDate, connectionAttempt, queryClient]);

  const query = useQuery({
    queryKey: day === undefined ? kitchenTicketKeys.today(today) : kitchenTicketKeys.day(day),
    queryFn: queryDate ? ({ signal }) => getTicketsForDay(queryDate, signal) : skipToken,
    enabled: enabled && queryDate !== undefined,
    // Today's stream keeps it fresh; refetch when the window comes back, in case the stream stalled.
    staleTime: liveDate ? Infinity : 60_000,
    refetchOnWindowFocus: liveDate ? "always" : true,
    retry: false,
  });

  const streamStatus: KitchenStreamStatus = !enabled || day !== undefined
    ? "idle"
    : streamState && streamState.date === liveDate && streamState.attempt === connectionAttempt
      ? streamState.status
      : "connecting";
  const { refetch } = query;

  return {
    ...query,
    streamStatus,
    retryToday: () => {
      if (!liveDate) return;
      if (streamStatus === "disconnected") setConnectionAttempt((attempt) => attempt + 1);
      void refetch();
    },
  };
}
