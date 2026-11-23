import type { ReactNode } from "react";
import { DataTable, DataTableHead } from "@/src/components/ui/organisms/data-table";
import type { KitchenTicket } from "../../utils/tickets";
import { COL, COLUMN_COUNT } from "../../utils/table-columns";
import TicketRow from "../molecules/ticket-row";
import TicketSkeletonRow from "../molecules/ticket-skeleton-row";

type TicketsTableProps = {
  tickets: KitchenTicket[];
  /** Undefined until the page has a clock: skeleton rows. */
  now: number | undefined;
  onView?: (ticket: KitchenTicket) => void;
  emptyMessage?: ReactNode;
  footer?: ReactNode;
};

export default function TicketsTable({
  tickets,
  now,
  onView,
  emptyMessage = "No open tickets.",
  footer,
}: TicketsTableProps) {
  return (
    <DataTable
      columnCount={COLUMN_COUNT}
      loading={now === undefined}
      loadingLabel="Loading tickets…"
      skeletonRow={(i) => <TicketSkeletonRow index={i} />}
      emptyMessage={emptyMessage}
      footer={footer}
      head={
        <>
          <DataTableHead className={COL.ticket}>Ticket</DataTableHead>
          <DataTableHead className={`hidden md:table-cell ${COL.brand}`}>Brand</DataTableHead>
          <DataTableHead className={`hidden sm:table-cell ${COL.stage}`}>Stage</DataTableHead>
          <DataTableHead className={COL.sinceSent}>Since order sent</DataTableHead>
          <DataTableHead className={`hidden lg:table-cell ${COL.created}`}>Created</DataTableHead>
          <DataTableHead className={`w-px ${COL.view}`}>
            <span className="sr-only">Actions</span>
          </DataTableHead>
        </>
      }
      rows={
        now === undefined
          ? []
          : tickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} now={now} onView={onView} />)
      }
    />
  );
}
