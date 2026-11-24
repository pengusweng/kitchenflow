import { TableCell, TableRow } from "@/components/ui/table";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";

// Varied widths so a stack of rows reads as a list of names, not a grid.
const NAME_WIDTHS = ["w-40", "w-32", "w-48", "w-36"];

export default function BrandSkeletonRow({ index }: { index: number }) {
  return (
    <TableRow aria-hidden="true" className="border-hairline hover:bg-transparent motion-safe:animate-pulse">
      <TableCell className="px-3 py-3 md:px-4">
        <SkeletonBar className="w-8" />
      </TableCell>
      <TableCell className="px-3 py-3 md:px-4">
        <SkeletonBar className={NAME_WIDTHS[index % NAME_WIDTHS.length]} />
      </TableCell>
      <TableCell className="px-3 py-3 md:px-4">
        <span className="block h-6 w-20 rounded-full bg-ink/8" />
      </TableCell>
      <TableCell className="py-3 pr-1.5 pl-1 md:pr-2 md:pl-4">
        <span className="ml-auto block h-8 w-16 rounded-md bg-ink/8" />
      </TableCell>
    </TableRow>
  );
}
