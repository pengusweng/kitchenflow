import type { ReactNode } from "react";
import { DataTable, DataTableHead } from "@/src/components/ui/organisms/data-table";
import type { Brand } from "../../utils/brands";
import { COL, COLUMN_COUNT } from "../../utils/table-columns";
import BrandRow from "../molecules/brand-row";
import BrandSkeletonRow from "../molecules/brand-skeleton-row";

type BrandsTableProps = {
  brands: Brand[];
  onView?: (brand: Brand) => void;
  loading?: boolean;
  refreshing?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  footer?: ReactNode;
};

export default function BrandsTable({
  brands,
  onView,
  loading = false,
  refreshing = false,
  skeletonRows,
  emptyMessage = "No brands yet.",
  footer,
}: BrandsTableProps) {
  return (
    <DataTable
      columnCount={COLUMN_COUNT}
      loading={loading}
      refreshing={refreshing}
      loadingLabel="Loading brands…"
      skeletonRows={skeletonRows}
      skeletonRow={(i) => <BrandSkeletonRow index={i} />}
      emptyMessage={emptyMessage}
      footer={footer}
      head={
        <>
          <DataTableHead className={`w-px ${COL.code}`}>Code</DataTableHead>
          <DataTableHead className={COL.name}>Name</DataTableHead>
          <DataTableHead className={`w-px ${COL.status}`}>Status</DataTableHead>
          <DataTableHead className={`w-px ${COL.view}`}>
            <span className="sr-only">View</span>
          </DataTableHead>
        </>
      }
      rows={brands.map((brand) => (
        <BrandRow key={brand.id} brand={brand} onView={onView} />
      ))}
    />
  );
}
