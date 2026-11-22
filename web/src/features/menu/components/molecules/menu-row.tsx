import { Ban } from "lucide-react";
import { cn } from "cn";
import { TableCell, TableRow } from "@/components/ui/table";
import ViewButton from "@/src/components/ui/atoms/view-button";
import { formatPeso, type MenuItem } from "../../utils/menu";
import AvailabilitySwitch from "../atoms/availability-switch";
import ChannelTags from "../atoms/channel-tags";
import ItemThumb from "../atoms/item-thumb";

type MenuRowProps = {
  item: MenuItem;
  /** False when a single brand is picked and the Brand column is dropped. */
  showBrand: boolean;
  onAvailabilityChange: (item: MenuItem, available: boolean) => void;
  onView?: (item: MenuItem) => void;
};

function BrandName({ item }: { item: MenuItem }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.brand.accent }} />
      {item.brand.name}
    </span>
  );
}

export default function MenuRow({ item, showBrand, onAvailabilityChange, onView }: MenuRowProps) {
  const off = !item.available;

  return (
    <TableRow className={cn("border-hairline hover:bg-surface-hover/50", off && "bg-surface-hover/35")}>
      <TableCell className="px-3 py-2.5 whitespace-normal md:px-4">
        <div className="flex items-center gap-3">
          <ItemThumb item={item} dim={off} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={cn("font-semibold", off ? "text-ink-muted" : "text-ink")}>
              {item.name}
              {item.active ? null : (
                <span className="ml-2 inline-flex h-5 items-center rounded-full border border-hairline px-2 align-[1px] text-xs font-semibold text-ink-muted">
                  Inactive
                </span>
              )}
            </span>
            {/* Codes wrap at their hyphens, never mid-word. */}
            <span className="font-mono text-xs break-words text-ink-muted">{item.code}</span>
            {/* Narrow screens drop the Brand and Price columns; they ride along here instead. */}
            <span className="text-ink-muted md:hidden">
              {showBrand ? <>{item.brand.name} · </> : null}
              <span className="whitespace-nowrap tabular-nums">{formatPeso(item.basePrice)}</span>
            </span>
            {/* Phones show the switch without its label, so the state is spelled out here. */}
            {off ? (
              <span aria-hidden="true" className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger-ink sm:hidden">
                <Ban className="size-3.5" strokeWidth={2.5} />
                Unavailable
              </span>
            ) : null}
          </div>
        </div>
      </TableCell>
      {showBrand ? (
        <TableCell className="hidden px-4 py-2.5 text-ink md:table-cell xl:whitespace-normal">
          <BrandName item={item} />
        </TableCell>
      ) : null}
      <TableCell
        className={cn("hidden px-4 py-2.5 text-right tabular-nums slashed-zero md:table-cell", off ? "text-ink-muted" : "text-ink")}
      >
        {formatPeso(item.basePrice)}
      </TableCell>
      <TableCell className={cn("hidden px-4 py-2.5 xl:table-cell", off && "opacity-60")}>
        <ChannelTags channels={item.channels} />
      </TableCell>
      <TableCell className="px-2 py-2.5 md:px-4">
        <AvailabilitySwitch
          itemName={item.name}
          available={item.available}
          onChange={(available) => onAvailabilityChange(item, available)}
        />
      </TableCell>
      <TableCell className="py-2.5 pr-1.5 pl-1 text-right md:pr-2 md:pl-4">
        <ViewButton label={`View ${item.name}`} onClick={() => onView?.(item)} />
      </TableCell>
    </TableRow>
  );
}
