import { cn } from "cn";
import { TableCell, TableRow } from "@/components/ui/table";
import BrandLabel from "@/src/components/ui/atoms/brand-label";
import ViewButton from "@/src/components/ui/atoms/view-button";
import { formatTicketTime, isHandedOver, type KitchenTicket } from "../../utils/tickets";
import StageBadge from "../atoms/stage-badge";
import SinceSent from "./since-sent";

type TicketRowProps = {
  ticket: KitchenTicket;
  now: number;
  onView?: (ticket: KitchenTicket) => void;
};

export default function TicketRow({ ticket, now, onView }: TicketRowProps) {
  const created = formatTicketTime(ticket.createdAt);
  return (
    <TableRow
      className={cn("border-hairline hover:bg-surface-hover/50", isHandedOver(ticket) && "bg-surface-hover/35")}
    >
      <TableCell className="px-3 py-2.5 whitespace-normal md:px-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold text-ink tabular-nums slashed-zero">{ticket.number}</span>
          <span className="text-sm text-ink-muted tabular-nums slashed-zero">{ticket.orderCode}</span>
          {/* Narrow screens drop the Brand and Stage columns; they ride along here instead. */}
          <span className="pt-0.5 text-sm text-ink md:hidden">
            <BrandLabel brand={ticket.brand} />
          </span>
          <span className="pt-1 sm:hidden">
            <StageBadge ticket={ticket} />
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden px-4 py-2.5 whitespace-normal text-ink md:table-cell">
        <BrandLabel brand={ticket.brand} />
      </TableCell>
      <TableCell className="hidden px-4 py-2.5 sm:table-cell">
        <StageBadge ticket={ticket} />
      </TableCell>
      <TableCell className="px-3 py-2.5 md:px-4">
        <SinceSent ticket={ticket} now={now} className="min-w-32" />
      </TableCell>
      {/* No tabular-nums here: this face gives the comma a figure's width too. */}
      <TableCell className="hidden px-4 py-2.5 text-ink lg:table-cell">
        <time dateTime={ticket.createdAt} className="flex flex-col">
          <span>{created.time}</span>
          <span className="text-sm text-ink-muted">{created.date}</span>
        </time>
      </TableCell>
      <TableCell className="py-2.5 pr-1.5 pl-1 text-right md:pr-2 md:pl-4">
        <ViewButton label={`View ticket ${ticket.number}`} onClick={() => onView?.(ticket)} />
      </TableCell>
    </TableRow>
  );
}
