"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import BrandDetailModal from "../components/organisms/brand-detail-modal";
import BrandsFilterBar from "../components/organisms/brands-filter-bar";
import BrandsTable from "../components/organisms/brands-table";
import CreateBrandModal from "../components/organisms/create-brand-modal";
import EditBrandModal from "../components/organisms/edit-brand-modal";
import { BRANDS_PAGE_SIZE, useBrands } from "../hooks/useBrands";
import { useDeactivateBrand } from "../hooks/useDeactivateBrand";
import { toBrand, type Brand, type BrandStatusFilter } from "../utils/brands";

const NO_COUNTS: Record<BrandStatusFilter, number> = { all: 0, active: 0, inactive: 0 };

export default function BrandsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BrandStatusFilter>("all");
  const search = useDebouncedValue(query.trim());
  const [creating, setCreating] = useState(false);

  const [viewing, setViewing] = useState<Brand | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { deactivate, error: deactivateError, resetError } = useDeactivateBrand((brand) => {
    setViewing(brand); // the modal now shows "Inactive" and hides its actions
  });

  // A new search or status starts back on page 1.
  const filterKey = `${status}|${search}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  const { data, error, isPending, isPlaceholderData } = useBrands({ status, search, page });

  const brands = data?.data.map(toBrand) ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;

  let emptyMessage = "No brands match these filters.";
  if (error) emptyMessage = error.message;
  else if (meta?.counts.all === 0 && !search) emptyMessage = "No brands yet.";

  return (
    <section className="motion-safe:animate-page-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Brands</PageTitle>
        <Button size="lg" className="h-10 px-4 font-semibold" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Add brand
        </Button>
      </div>

      <BrandsFilterBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        counts={meta?.counts ?? NO_COUNTS}
        resultCount={total}
      />

      <BrandsTable
        brands={brands}
        onView={(brand) => {
          setViewing(brand);
          setModalOpen(true);
        }}
        loading={isPending}
        refreshing={isPlaceholderData}
        skeletonRows={brands.length || BRANDS_PAGE_SIZE}
        emptyMessage={emptyMessage}
        footer={
          total > 0 ? (
            <Pagination
              page={page}
              pageSize={BRANDS_PAGE_SIZE}
              total={total}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={(next) => setPaging({ filterKey, page: next })}
            />
          ) : null
        }
      />

      <BrandDetailModal
        brand={viewing}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetError();
        }}
        onDeactivate={(brand) => deactivate(brand)}
        onEdit={() => {
          resetError();
          setModalOpen(false);
          setEditOpen(true);
        }}
        error={deactivateError}
      />

      <EditBrandModal
        brand={viewing}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setModalOpen(true); // cancel goes back to the brand details
        }}
        onSaved={(brand) => {
          setViewing(toBrand(brand));
          setEditOpen(false);
          setModalOpen(true);
        }}
      />

      <CreateBrandModal
        open={creating}
        onOpenChange={setCreating}
        onCreated={(brand) => {
          // Confirm by opening the new brand's details.
          setCreating(false);
          setViewing(toBrand(brand));
          setModalOpen(true);
        }}
      />
    </section>
  );
}
