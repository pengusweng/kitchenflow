"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import BrandDetailModal from "../components/organisms/brand-detail-modal";
import CreateBrandModal from "../components/organisms/create-brand-modal";
import BrandsFilterBar from "../components/organisms/brands-filter-bar";
import BrandsTable from "../components/organisms/brands-table";
import { BRANDS, BRANDS_PAGE_SIZE, type Brand, type BrandStatusFilter } from "../utils/brands";

export default function BrandsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BrandStatusFilter>("all");

  const [viewing, setViewing] = useState<Brand | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Filtered client-side while the list is placeholder data.
  const search = query.trim().toLowerCase();
  const matches = BRANDS.filter(
    (brand) => !search || brand.name.toLowerCase().includes(search) || brand.code.toLowerCase().includes(search),
  );
  const counts: Record<BrandStatusFilter, number> = {
    all: matches.length,
    active: matches.filter((brand) => brand.status === "active").length,
    inactive: matches.filter((brand) => brand.status === "inactive").length,
  };
  const filtered = status === "all" ? matches : matches.filter((brand) => brand.status === status);

  // A new search or status starts back on page 1.
  const filterKey = `${status}|${search}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  const total = filtered.length;
  const totalPages = Math.ceil(total / BRANDS_PAGE_SIZE);
  const brands = filtered.slice((page - 1) * BRANDS_PAGE_SIZE, page * BRANDS_PAGE_SIZE);

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
        counts={counts}
        resultCount={total}
      />

      <BrandsTable
        brands={brands}
        emptyMessage={BRANDS.length === 0 ? "No brands yet." : "No brands match these filters."}
        footer={
          total > 0 ? (
            <Pagination
              page={page}
              pageSize={BRANDS_PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              onPageChange={(next) => setPaging({ filterKey, page: next })}
            />
          ) : null
        }
        onView={(brand) => {
          setViewing(brand);
          setModalOpen(true);
        }}
      />

      <BrandDetailModal brand={viewing} open={modalOpen} onOpenChange={setModalOpen} />

      <CreateBrandModal open={creating} onOpenChange={setCreating} />
    </section>
  );
}
