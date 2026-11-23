"use client";

import { useState } from "react";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { useRecipeBrands } from "@/src/features/recipes/hooks/useRecipeBrands";
import { useTodayInManila } from "@/src/features/orders/hooks/useTodayInManila";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import TicketDetailModal from "../components/organisms/ticket-detail-modal";
import TicketsFilterBar from "../components/organisms/tickets-filter-bar";
import TicketsTable from "../components/organisms/tickets-table";
import { useNow } from "../hooks/useNow";
import { useDayTickets } from "../hooks/useDayTickets";
import { useHandoffPhotos, useQcHistory } from "../hooks/useTicketDetail";
import { toKitchenTickets } from "../utils/ticket-records";
import { countFlagged, filterTickets, TICKETS_PAGE_SIZE, type TicketStage } from "../utils/tickets";

// Every ticket still on the line, across brands, with the ones that need
// someone flagged in red and sorted to the top: open 15 minutes or more, in
// rework, or waiting for QC again after failing. Earlier days can be looked
// back on: every ticket from that day, open ones first.
export default function KitchenOverviewPage() {
  const now = useNow();
  const todayDate = useTodayInManila();
  // Undefined is today, live from the server's stream; otherwise an earlier day (YYYY-MM-DD).
  const [day, setDay] = useState<string | undefined>();
  const pastDay = day !== undefined;
  const dayTickets = useDayTickets(day);
  const brands = useRecipeBrands();
  const tickets = toKitchenTickets(dayTickets.data ?? [], brands.brandFor);

  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string | undefined>();
  const [stage, setStage] = useState<TicketStage | undefined>();
  const search = useDebouncedValue(query.trim());

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const viewing = tickets.find((ticket) => ticket.id === viewingId) ?? null;
  const qc = useQcHistory(modalOpen ? viewing : null);
  const photos = useHandoffPhotos(modalOpen ? viewing : null);

  // Any filter change returns to page 1.
  const filterKey = `${day ?? ""}|${brand ?? ""}|${stage ?? ""}|${search}`;
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
                setDay(undefined);
                setQuery("");
                setBrand(undefined);
                setStage(undefined);
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
          setViewingId(ticket.id);
          setModalOpen(true);
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
        onOpenChange={setModalOpen}
        qc={{ data: qc.data, loading: qc.isPending, error: qc.error?.message }}
        photos={{ data: photos.data, loading: photos.isPending, error: photos.error?.message }}
      />
    </section>
  );
}
