import { TableCell, TableRow } from "@/components/ui/table";
import SkeletonBar from "@/src/components/ui/atoms/skeleton-bar";

// Varied widths so a stack of rows reads as a list, not a grid.
const WIDTHS = [
  { name: "w-36", code: "w-28", brand: "w-24" },
  { name: "w-28", code: "w-24", brand: "w-32" },
  { name: "w-44", code: "w-32", brand: "w-28" },
  { name: "w-32", code: "w-20", brand: "w-24" },
];

type RecipeSkeletonRowProps = { index: number; showBrand: boolean };

export default function RecipeSkeletonRow({ index, showBrand }: RecipeSkeletonRowProps) {
  const w = WIDTHS[index % WIDTHS.length];
  return (
    <TableRow aria-hidden="true" className="border-hairline hover:bg-transparent motion-safe:animate-pulse">
      <TableCell className="px-3 py-3 md:px-4">
        <div className="flex flex-col gap-0.5">
          <SkeletonBar className={w.name} />
          <SkeletonBar className={w.code} />
        </div>
      </TableCell>
      {showBrand ? (
        <TableCell className="hidden px-4 py-3 md:table-cell">
          <SkeletonBar className={w.brand} />
        </TableCell>
      ) : null}
      <TableCell className="hidden px-4 py-3 md:table-cell">
        <SkeletonBar className="w-8" />
      </TableCell>
      <TableCell className="hidden px-4 py-3 lg:table-cell">
        <SkeletonBar className="w-24" />
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
