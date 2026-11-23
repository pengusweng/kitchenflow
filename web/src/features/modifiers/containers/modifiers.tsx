"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { MOCK_BRANDS } from "@/src/features/menu/utils/mock-menu";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import CreateModifierModal from "../components/organisms/create-modifier-modal";
import EditModifierModal from "../components/organisms/edit-modifier-modal";
import ModifierDetailModal from "../components/organisms/modifier-detail-modal";
import ModifiersFilterBar from "../components/organisms/modifiers-filter-bar";
import ModifiersTable from "../components/organisms/modifiers-table";
import { MOCK_MODIFIERS, toModifier } from "../utils/mock-modifiers";
import {
  countModifiers,
  filterModifiers,
  MODIFIER_PAGE_SIZE,
  type Modifier,
  type StatusFilter,
} from "../utils/modifiers";

// The shared catalog of add-ons ("Extra rice", "Oat milk"). Each menu item
// picks which ones it offers and at what price; this page owns what they're
// called and whether they're still in use.
export default function ModifiersPage() {
  // Placeholder data until the modifiers API is wired up; changes last until reload.
  const [modifiers, setModifiers] = useState<Modifier[]>(() => MOCK_MODIFIERS.map((record) => toModifier(record)));

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter | undefined>("active");
  const [brand, setBrand] = useState<string | undefined>();
  const search = useDebouncedValue(query.trim());

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const viewing = modifiers.find((modifier) => modifier.id === viewingId) ?? null;

  const update = (id: string, patch: Partial<Modifier>) =>
    setModifiers((current) =>
      current.map((modifier) =>
        modifier.id === id ? { ...modifier, ...patch, modifiedAt: new Date().toISOString() } : modifier,
      ),
    );

  // Any filter change returns to page 1.
  const filterKey = `${brand ?? ""}|${status ?? ""}|${search}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  const filters = { search, brand, status };
  const rows = filterModifiers(modifiers, filters);
  const counts = countModifiers(modifiers, filters);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / MODIFIER_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * MODIFIER_PAGE_SIZE, currentPage * MODIFIER_PAGE_SIZE);

  const filtered = Boolean(query.trim() || brand || status !== "active");
  const emptyMessage = filtered ? "No modifiers match these filters." : "No modifiers yet.";

  return (
    <section className="motion-safe:animate-page-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Modifiers</PageTitle>
        <Button size="lg" className="h-10 px-4 font-semibold" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Add modifier
        </Button>
      </div>

      <ModifiersFilterBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        brands={MOCK_BRANDS}
        brand={brand}
        onBrandChange={setBrand}
        counts={counts}
        resultCount={total}
        onClear={
          filtered
            ? () => {
                setQuery("");
                setBrand(undefined);
                setStatus("active");
              }
            : undefined
        }
      />

      <ModifiersTable
        modifiers={pageRows}
        onView={(modifier) => {
          setViewingId(modifier.id);
          setModalOpen(true);
        }}
        emptyMessage={emptyMessage}
        footer={
          total > 0 ? (
            <Pagination
              page={currentPage}
              pageSize={MODIFIER_PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              onPageChange={(next) => setPaging({ filterKey, page: next })}
            />
          ) : null
        }
      />

      <ModifierDetailModal
        modifier={viewing}
        open={modalOpen}
        onOpenChange={setModalOpen}
        brands={MOCK_BRANDS}
        onEdit={() => {
          setModalOpen(false);
          setEditOpen(true);
        }}
        // The modal stays open and now reads "Inactive", with Reactivate in place of Edit.
        onDeactivate={(target) => update(target.id, { active: false })}
        onReactivate={(target) => update(target.id, { active: true })}
      />

      <EditModifierModal
        modifier={viewing}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setModalOpen(true); // cancel goes back to the modifier's details
        }}
        onSaved={(saved) => {
          setModifiers((current) => current.map((modifier) => (modifier.id === saved.id ? saved : modifier)));
          setEditOpen(false);
          setModalOpen(true); // the details show what was saved
        }}
        takenCodes={new Set(modifiers.filter((modifier) => modifier.id !== viewingId).map((modifier) => modifier.code))}
      />

      <CreateModifierModal
        open={creating}
        onOpenChange={setCreating}
        onCreated={(created) => {
          setModifiers((current) => [...current, created]);
          // Confirm by opening the new modifier's details.
          setCreating(false);
          setViewingId(created.id);
          setModalOpen(true);
        }}
        takenCodes={new Set(modifiers.map((modifier) => modifier.code))}
      />
    </section>
  );
}
