import type { ReactNode } from "react";
import { DataTable, DataTableHead } from "@/src/components/ui/organisms/data-table";
import type { MenuItem } from "../../utils/menu";
import { COL, columnCount } from "../../utils/table-columns";
import MenuRow from "../molecules/menu-row";
import MenuSkeletonRow from "../molecules/menu-skeleton-row";

type MenuTableProps = {
  items: MenuItem[];
  /** False when a single brand is picked: every row would say the same brand. */
  showBrand: boolean;
  onAvailabilityChange: (item: MenuItem, available: boolean) => void;
  onView?: (item: MenuItem) => void;
  loading?: boolean;
  refreshing?: boolean;
  skeletonRows?: number;
  emptyMessage?: ReactNode;
  footer?: ReactNode;
};

export default function MenuTable({
  items,
  showBrand,
  onAvailabilityChange,
  onView,
  loading = false,
  refreshing = false,
  skeletonRows,
  emptyMessage = "No menu items yet.",
  footer,
}: MenuTableProps) {
  return (
    <DataTable
      columnCount={columnCount(showBrand)}
      loading={loading}
      refreshing={refreshing}
      loadingLabel="Loading menu items…"
      skeletonRows={skeletonRows}
      skeletonRow={(i) => <MenuSkeletonRow index={i} showBrand={showBrand} />}
      emptyMessage={emptyMessage}
      footer={footer}
      head={
        <>
          <DataTableHead className={COL.item}>Item</DataTableHead>
          {showBrand ? <DataTableHead className={`hidden md:table-cell ${COL.brand}`}>Brand</DataTableHead> : null}
          <DataTableHead className={`hidden text-right md:table-cell ${COL.price}`}>Base price</DataTableHead>
          <DataTableHead className={`hidden xl:table-cell ${COL.channels}`}>Channels</DataTableHead>
          <DataTableHead className={`w-px ${COL.availability}`}>Availability</DataTableHead>
          <DataTableHead className={`w-px ${COL.view}`}>
            <span className="sr-only">Actions</span>
          </DataTableHead>
        </>
      }
      rows={items.map((item) => (
        <MenuRow
          key={item.id}
          item={item}
          showBrand={showBrand}
          onAvailabilityChange={onAvailabilityChange}
          onView={onView}
        />
      ))}
    />
  );
}
