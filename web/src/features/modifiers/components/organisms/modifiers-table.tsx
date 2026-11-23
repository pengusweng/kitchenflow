import type { ReactNode } from "react";
import {
  DataTable,
  DataTableHead,
} from "@/src/components/ui/organisms/data-table";
import type { Modifier } from "../../utils/modifiers";
import { COL, COLUMN_COUNT } from "../../utils/table-columns";
import ModifierRow from "../molecules/modifier-row";
import ModifierSkeletonRow from "../molecules/modifier-skeleton-row";

type ModifiersTableProps = {
  modifiers: Modifier[];
  onView?: (modifier: Modifier) => void;
  loading?: boolean;
  refreshing?: boolean;
  skeletonRows?: number;
  emptyMessage?: ReactNode;
  footer?: ReactNode;
};

export default function ModifiersTable({
  modifiers,
  onView,
  loading = false,
  refreshing = false,
  skeletonRows,
  emptyMessage = "No modifiers yet.",
  footer,
}: ModifiersTableProps) {
  return (
    <DataTable
      columnCount={COLUMN_COUNT}
      loading={loading}
      refreshing={refreshing}
      loadingLabel="Loading modifiers…"
      skeletonRows={skeletonRows}
      skeletonRow={(i) => <ModifierSkeletonRow index={i} />}
      emptyMessage={emptyMessage}
      footer={footer}
      head={
        <>
          <DataTableHead className={COL.modifier}>Modifier</DataTableHead>
          <DataTableHead className={`hidden md:table-cell ${COL.code}`}>
            Code
          </DataTableHead>
          <DataTableHead className={`hidden lg:table-cell ${COL.updated}`}>
            Updated
          </DataTableHead>
          <DataTableHead
            className={`hidden text-right sm:table-cell ${COL.usedOn}`}
          >
            Used on
          </DataTableHead>
          <DataTableHead className={`w-px ${COL.status}`}>Status</DataTableHead>
          <DataTableHead className={`w-px ${COL.view}`}>
            <span className="sr-only">Actions</span>
          </DataTableHead>
        </>
      }
      rows={modifiers.map((modifier) => (
        <ModifierRow key={modifier.id} modifier={modifier} onView={onView} />
      ))}
    />
  );
}
