import { TableCell, TableRow } from "@/components/ui/table";
import ViewButton from "@/src/components/ui/atoms/view-button";
import type { Brand } from "../../utils/brands";
import StatusBadge from "../atoms/status-badge";

type BrandRowProps = {
  brand: Brand;
  onView?: (brand: Brand) => void;
};

export default function BrandRow({ brand, onView }: BrandRowProps) {
  return (
    <TableRow className="border-hairline hover:bg-surface-hover/50">
      <TableCell className="px-3 py-3 font-mono text-ink-muted md:px-4">{brand.code}</TableCell>
      <TableCell className="px-3 py-3 font-semibold whitespace-normal text-ink md:px-4">{brand.name}</TableCell>
      <TableCell className="px-3 py-3 md:px-4">
        <StatusBadge status={brand.status} />
      </TableCell>
      <TableCell className="py-3 pr-1.5 pl-1 text-right md:pr-2 md:pl-4">
        <ViewButton label={`View ${brand.name}`} onClick={() => onView?.(brand)} />
      </TableCell>
    </TableRow>
  );
}
