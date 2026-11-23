import { TableCell, TableRow } from "@/components/ui/table";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";

// Varied widths so a stack of rows reads as a list, not a grid.
const BRAND_WIDTHS = ["w-24", "w-32", "w-28"];

export default function TicketSkeletonRow({ index }: { index: number }) {
  return (
    <TableRow aria-hidden="true" className="border-hairline hover:bg-transparent motion-safe:animate-pulse">
      <TableCell className="px-3 py-2.5 md:px-4">
        <span className="flex flex-col gap-1.5">
          <SkeletonBar className="w-14" />
          <SkeletonBar className="w-20" />
        </span>
      </TableCell>
      <TableCell className="hidden px-4 py-2.5 md:table-cell">
        <SkeletonBar className={BRAND_WIDTHS[index % BRAND_WIDTHS.length]} />
      </TableCell>
      <TableCell className="hidden px-4 py-2.5 sm:table-cell">
        <span className="block h-6 w-24 rounded-full bg-ink/8" />
      </TableCell>
      <TableCell className="px-3 py-2.5 md:px-4">
        <span className="flex items-center gap-3">
          <SkeletonBar className="w-10" />
          <span className="block h-1.5 min-w-12 flex-1 rounded-full bg-ink/8" />
        </span>
      </TableCell>
      <TableCell className="hidden px-4 py-2.5 lg:table-cell">
        <SkeletonBar className="w-16" />
      </TableCell>
      <TableCell className="py-2.5 pr-1.5 pl-1 md:pr-2 md:pl-4">
        <span className="ml-auto block h-8 w-16 rounded-md bg-ink/8" />
      </TableCell>
    </TableRow>
  );
}
