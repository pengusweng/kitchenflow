"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { useRecipeBrands } from "@/src/features/recipes/hooks/useRecipeBrands";
import { useTodayInManila } from "@/src/features/orders/hooks/useTodayInManila";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { replaceSearchParams } from "@/src/lib/search-params";
import TicketDetailModal from "../components/organisms/ticket-detail-modal";
import TicketsFilterBar from "../components/organisms/tickets-filter-bar";
import TicketsTable from "../components/organisms/tickets-table";
import { useNow } from "../hooks/useNow";
import { useDayTickets } from "../hooks/useDayTickets";
import { useHandoffPhotos, useQcHistory } from "../hooks/useTicketDetail";
import { toKitchenTickets } from "../utils/ticket-records";
import { countFlagged, filterTickets, TICKET_STAGES, TICKETS_PAGE_SIZE, type TicketStage } from "../utils/tickets";

const VALID_STAGES = new Set<TicketStage>(TICKET_STAGES);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Every ticket still on the line, across brands, with the ones that need
// someone flagged in red and sorted to the top: open 15 minutes or more, in
// rework, or waiting for QC again after failing. Earlier days can be looked
// back on: every ticket from that day, open ones first.
export default function KitchenOverviewPage() {
  const searchParams = useSearchParams();
  const now = useNow();
  const todayDate = useTodayInManila();

  // Undefined is today, live from the server's stream; otherwise an earlier day (YYYY-MM-DD).
  const dayParam = searchParams.get("day");
  const day = dayParam && todayDate && DATE_RE.test(dayParam) && dayParam < todayDate ? dayParam : undefined;
  const pastDay = day !== undefined;
  const dayTickets = useDayTickets(day);
  const brands = useRecipeBrands();
  const tickets = toKitchenTickets(dayTickets.data ?? [], brands.brandFor);

  const [query, setQuery] = useState("");
  const brandParam = searchParams.get("brand")?.toUpperCase();
  const brand = brandParam && brands.brands.some((b) => b.code === brandParam) ? brandParam : brandParam || undefined;
  const stageParam = searchParams.get("stage")?.toUpperCase();
  const stage: TicketStage | undefined =
    stageParam && VALID_STAGES.has(stageParam as TicketStage) ? (stageParam as TicketStage) : undefined;
  const ticketParam = searchParams.get("ticket");
  const search = useDebouncedValue(query.trim());

  const [manualViewingId, setManualViewingId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const deepLinkedTicket = ticketParam
    ? tickets.find((ticket) => ticket.id === ticketParam || ticket.number === ticketParam) ?? null
    : null;
  const modalOpen = Boolean(ticketParam) || manualOpen;
  const viewing =
    (ticketParam ? deepLinkedTicket : null) ??
    tickets.find((ticket) => ticket.id === manualViewingId) ??
    null;
  const qc = useQcHistory(modalOpen ? viewing : null);
  const photos = useHandoffPhotos(modalOpen ? viewing : null);

  function setDay(next: string | undefined) {
    replaceSearchParams(searchParams, (params) => {
      if (next) params.set("day", next);
      else params.delete("day");
    });
  }

  function setBrand(next: string | undefined) {
    replaceSearchParams(searchParams, (params) => {
      if (next) params.set("brand", next);
      else params.delete("brand");
    });
  }

  function setStage(next: TicketStage | undefined) {
    replaceSearchParams(searchParams, (params) => {
      if (next) params.set("stage", next);
      else params.delete("stage");
    });
  }

  function handleModalOpenChange(open: boolean) {
    setManualOpen(open);
    if (!open && ticketParam) {
      setManualViewingId(null);
      replaceSearchParams(searchParams, (params) => {
        params.delete("ticket");
      });
    }
  }

  // Any filter change returns to page 1.
  const filterKey = `${day ?? todayDate ?? ""}|${brand ?? ""}|${stage ?? ""}|${search}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  const rows = now === undefined ? [] : filterTickets(tickets, { search, brand, stage, withHandedOver: pastDay }, now);
  const flagged = now === undefined ? 0 : countFlagged(rows, now);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / TICKETS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * TICKETS_PAGE_SIZE, currentPage * TICKETS_PAGE_SIZE);

  const narrowed = Boolean(query.trim() || brand || stage);
  const onlyHandedOver = stage === "HANDED_OVER" && !query.trim() && !brand;
  let emptyMessage = pastDay ? "No kitchen tickets that day." : "No open tickets. The line is clear.";
  if (narrowed) emptyMessage = "No tickets match these filters.";
  if (onlyHandedOver) emptyMessage = pastDay ? "Nothing was handed over that day." : "Nothing handed over yet today.";
  if (dayTickets.error) emptyMessage = dayTickets.error.message;

  return (
    <section className="motion-safe:animate-page-in">
      <PageTitle>Kitchen overview</PageTitle>

      <TicketsFilterBar
        day={day ?? todayDate}
        today={todayDate}
        // Picking today goes back to the live board.
        onDayChange={(next) => setDay(next && todayDate && next < todayDate ? next : undefined)}
        query={query}
        onQueryChange={setQuery}
        brands={brands.brands}
        brand={brand}
        onBrandChange={setBrand}
        stage={stage}
        onStageChange={setStage}
        resultCount={total}
        flaggedCount={flagged}
        onClear={
          narrowed || pastDay
            ? () => {
                setQuery("");
                replaceSearchParams(searchParams, (params) => {
                  params.delete("day");
                  params.delete("brand");
                  params.delete("stage");
                });
              }
            : undefined
        }
      />

      <TicketsTable
        tickets={pageRows}
        now={now}
        // Brands too, so no row flashes "Unknown brand" before they arrive.
        loading={now === undefined || dayTickets.isPending || brands.isPending}
        onView={(ticket) => {
          setManualViewingId(ticket.id);
          setManualOpen(true);
        }}
        emptyMessage={emptyMessage}
        footer={
          total > 0 ? (
            <Pagination
              page={currentPage}
              pageSize={TICKETS_PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              onPageChange={(next) => setPaging({ filterKey, page: next })}
            />
          ) : null
        }
      />

      <TicketDetailModal
        ticket={viewing}
        now={now}
        open={modalOpen}
        onOpenChange={handleModalOpenChange}
        qc={{ data: qc.data, loading: qc.isPending, error: qc.error?.message }}
        photos={{ data: photos.data, loading: photos.isPending, error: photos.error?.message }}
      />
    </section>
  );
}
