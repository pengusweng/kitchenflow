import { TableCell, TableRow } from "@/components/ui/table";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";

// Varied widths so a stack of rows reads as a list, not a grid.
const WIDTHS = [
  { name: "w-32", code: "w-24" },
  { name: "w-24", code: "w-20" },
  { name: "w-40", code: "w-28" },
  { name: "w-28", code: "w-16" },
];

export default function ModifierSkeletonRow({ index }: { index: number }) {
  const w = WIDTHS[index % WIDTHS.length];
  return (
    <TableRow
      aria-hidden="true"
      className="border-hairline hover:bg-transparent motion-safe:animate-pulse"
    >
      <TableCell className="px-3 py-2.5 md:px-4">
        <SkeletonBar className={w.name} />
      </TableCell>
      <TableCell className="hidden px-4 py-2.5 md:table-cell">
        <SkeletonBar className={w.code} />
      </TableCell>
      <TableCell className="hidden px-4 py-2.5 lg:table-cell">
        <SkeletonBar className="w-24" />
      </TableCell>
      <TableCell className="hidden px-4 py-2.5 sm:table-cell">
        <SkeletonBar className="ml-auto w-14" />
      </TableCell>
      <TableCell className="px-3 py-2.5 md:px-4">
        <span className="block h-6 w-20 rounded-full bg-ink/8" />
      </TableCell>
      <TableCell className="py-2.5 pr-1.5 pl-1 md:pr-2 md:pl-4">
        <span className="ml-auto block h-8 w-16 rounded-md bg-ink/8" />
      </TableCell>
    </TableRow>
  );
}
