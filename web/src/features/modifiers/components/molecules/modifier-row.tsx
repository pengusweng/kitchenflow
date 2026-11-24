import { cn } from "cn";
import { TableCell, TableRow } from "@/components/ui/table";
import ViewButton from "@/src/components/ui/atoms/view-button";
import StatusBadge from "@/src/features/brands/components/atoms/status-badge";
import { formatDate, itemCount, type Modifier } from "../../utils/modifiers";

type ModifierRowProps = {
  modifier: Modifier;
  onView?: (modifier: Modifier) => void;
};

export default function ModifierRow({ modifier, onView }: ModifierRowProps) {
  const used = modifier.useCount;
  const usage = used === 0 ? "Not on any item" : itemCount(used);
  const muted = !modifier.active || used === 0;

  return (
    <TableRow className={cn("border-hairline hover:bg-surface-hover/50", !modifier.active && "bg-surface-hover/35")}>
      <TableCell className="px-3 py-2.5 whitespace-normal md:px-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("font-semibold", modifier.active ? "text-ink" : "text-ink-muted")}>{modifier.name}</span>
          {/* Narrow screens drop the Code and Used on columns; they ride along here instead. Codes wrap at their hyphens. */}
          <span className="font-mono text-xs break-words text-ink-muted md:hidden">{modifier.code}</span>
          <span className={cn("text-sm tabular-nums sm:hidden", muted ? "text-ink-muted" : "text-ink")}>{usage}</span>
        </div>
      </TableCell>
      <TableCell className="hidden px-4 py-2.5 font-mono text-sm break-words whitespace-normal text-ink-muted select-all md:table-cell">
        {modifier.code}
      </TableCell>
      {/* No tabular-nums here: this face gives the comma a figure's width too. */}
      <TableCell className="hidden px-4 py-2.5 text-ink lg:table-cell">
        <time dateTime={modifier.modifiedAt}>{formatDate(modifier.modifiedAt)}</time>
      </TableCell>
      <TableCell
        className={cn(
          "hidden px-4 py-2.5 text-right tabular-nums sm:table-cell",
          muted ? "text-ink-muted" : "text-ink",
        )}
      >
        {usage}
      </TableCell>
      <TableCell className="px-3 py-2.5 md:px-4">
        <StatusBadge status={modifier.active ? "active" : "inactive"} />
      </TableCell>
      <TableCell className="py-2.5 pr-1.5 pl-1 text-right md:pr-2 md:pl-4">
        <ViewButton label={`View ${modifier.name}`} onClick={() => onView?.(modifier)} />
      </TableCell>
    </TableRow>
  );
}
