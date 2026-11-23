"use client";

import { useMemo, useState } from "react";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { MOCK_BRANDS } from "@/src/features/menu/utils/mock-menu";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import TicketDetailModal from "../components/organisms/ticket-detail-modal";
import TicketsFilterBar from "../components/organisms/tickets-filter-bar";
import TicketsTable from "../components/organisms/tickets-table";
import { useNow } from "../hooks/useNow";
import { mockTickets } from "../utils/mock-tickets";
import { countFlagged, filterTickets, TICKETS_PAGE_SIZE, type TicketStage } from "../utils/tickets";

// Every ticket still on the line, across brands, with the ones that need
// someone flagged in red and sorted to the top: open 15 minutes or more, in
// rework, or waiting for QC again after failing.
export default function KitchenOverviewPage() {
  const now = useNow();
  // Placeholder tickets until the kitchen ticket API is wired up, placed around the moment the page opened.
  const [anchor, setAnchor] = useState<number | null>(null);
  if (now !== undefined && anchor === null) setAnchor(now);
  const tickets = useMemo(() => (anchor === null ? [] : mockTickets(anchor)), [anchor]);

  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState<string | undefined>();
  const [stage, setStage] = useState<TicketStage | undefined>();
  const search = useDebouncedValue(query.trim());

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const viewing = tickets.find((ticket) => ticket.id === viewingId) ?? null;

  // Any filter change returns to page 1.
  const filterKey = `${brand ?? ""}|${stage ?? ""}|${search}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  const rows = now === undefined ? [] : filterTickets(tickets, { search, brand, stage }, now);
  const flagged = now === undefined ? 0 : countFlagged(rows, now);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / TICKETS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * TICKETS_PAGE_SIZE, currentPage * TICKETS_PAGE_SIZE);

  const filtered = Boolean(query.trim() || brand || stage);
  const emptyMessage = filtered ? "No open tickets match these filters." : "No open tickets. The line is clear.";

  return (
    <section className="motion-safe:animate-page-in">
      <PageTitle>Kitchen overview</PageTitle>

      <TicketsFilterBar
        query={query}
        onQueryChange={setQuery}
        brands={MOCK_BRANDS}
        brand={brand}
        onBrandChange={setBrand}
        stage={stage}
        onStageChange={setStage}
        resultCount={total}
        flaggedCount={flagged}
        onClear={
          filtered
            ? () => {
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

      <TicketDetailModal ticket={viewing} now={now} open={modalOpen} onOpenChange={setModalOpen} />
    </section>
  );
}
