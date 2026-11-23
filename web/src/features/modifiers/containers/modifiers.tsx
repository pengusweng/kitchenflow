"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { useRecipeBrands } from "@/src/features/recipes/hooks/useRecipeBrands";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import CreateModifierModal from "../components/organisms/create-modifier-modal";
import EditModifierModal from "../components/organisms/edit-modifier-modal";
import ModifierDetailModal from "../components/organisms/modifier-detail-modal";
import ModifiersFilterBar from "../components/organisms/modifiers-filter-bar";
import ModifiersTable from "../components/organisms/modifiers-table";
import { useCreateModifier, useSetModifierActive, useUpdateModifier } from "../hooks/useModifierMutations";
import { useModifier, useModifiers } from "../hooks/useModifiers";
import { modifierStatusError } from "../utils/modifier-errors";
import { MODIFIER_PAGE_SIZE, toModifier, toModifierUses, type Modifier, type StatusFilter } from "../utils/modifiers";

// The shared catalog of add-ons ("Extra rice", "Oat milk"). Each menu item
// picks which ones it offers and at what price; this page owns what they're
// called and whether they're still in use. Search, filters and paging all
// happen on the API (GET /modifiers), in name order.
export default function ModifiersPage() {
  const brands = useRecipeBrands();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter | undefined>("active");
  const [brand, setBrand] = useState<string | undefined>();
  const search = useDebouncedValue(query.trim());
  const brandRecord = brand ? brands.brands.find((b) => b.code === brand) : undefined;

  // Any filter change returns to page 1.
  const filterKey = `${brand ?? ""}|${status ?? ""}|${search}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  const modifiers = useModifiers({
    page,
    limit: MODIFIER_PAGE_SIZE,
    status: status ?? "all",
    search: search || undefined,
    brandId: brandRecord?.id,
    sortBy: "name",
    sortOrder: "asc",
  });
  const rows = (modifiers.data?.data ?? []).map((record) => toModifier(record));
  const total = modifiers.data?.meta.total ?? 0;
  const totalPages = Math.max(1, modifiers.data?.meta.totalPages ?? 1);

  // The row that was opened, kept so the modals stay put if it leaves the page;
  // its own request brings the menu items and anything changed since.
  const [viewing, setViewing] = useState<Modifier | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const detail = useModifier(viewing?.id ?? null);
  const shown =
    detail.data && detail.data.modifier_id === viewing?.id
      ? toModifier(detail.data, detail.data.menu_item_modifiers_modifier.length)
      : viewing;
  const uses = detail.data ? toModifierUses(detail.data, brands.brandFor) : undefined;

  const createModifier = useCreateModifier();
  const updateModifier = useUpdateModifier();
  const setActive = useSetModifierActive();

  function view(modifier: Modifier) {
    setActive.reset();
    setViewing(modifier);
    setModalOpen(true);
  }

  function changeStatus(target: Modifier, active: boolean) {
    // The modal stays open and now reads "Inactive", with Reactivate in place of Edit.
    setActive.mutate(
      { id: target.id, active },
      {
        onSuccess: (record) => setViewing(toModifier(record, target.useCount)),
      },
    );
  }

  const filtered = Boolean(query.trim() || brand || status !== "active");
  let emptyMessage = filtered ? "No modifiers match these filters." : "No modifiers yet.";
  if (modifiers.error) emptyMessage = modifiers.error.message;

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
        brands={brands.brands}
        brand={brand}
        onBrandChange={setBrand}
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
        modifiers={rows}
        onView={view}
        loading={modifiers.isPending}
        refreshing={modifiers.isPlaceholderData}
        emptyMessage={emptyMessage}
        footer={
          total > 0 ? (
            <Pagination
              page={Math.min(page, totalPages)}
              pageSize={MODIFIER_PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              onPageChange={(next) => setPaging({ filterKey, page: next })}
            />
          ) : null
        }
      />

      <ModifierDetailModal
        modifier={shown}
        uses={uses}
        usesError={detail.error?.message}
        open={modalOpen}
        onOpenChange={setModalOpen}
        brands={brands.brands}
        onEdit={() => {
          setModalOpen(false);
          setEditOpen(true);
        }}
        onDeactivate={(target) => changeStatus(target, false)}
        onReactivate={(target) => changeStatus(target, true)}
        pending={setActive.isPending}
        actionError={
          setActive.error
            ? modifierStatusError(setActive.error, setActive.variables?.active ? "reactivate" : "deactivate")
            : undefined
        }
      />

      <EditModifierModal
        modifier={shown}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setModalOpen(true); // cancel goes back to the modifier's details
        }}
        onSubmit={async (payload) => {
          if (!shown) return;
          const saved = await updateModifier.mutateAsync({
            id: shown.id,
            payload,
          });
          setViewing(toModifier(saved, shown.useCount));
          setEditOpen(false);
          setModalOpen(true); // the details show what was saved
        }}
      />

      <CreateModifierModal
        open={creating}
        onOpenChange={setCreating}
        onSubmit={async (payload) => {
          const created = await createModifier.mutateAsync(payload);
          // Confirm by opening the new modifier's details.
          setCreating(false);
          view(toModifier(created));
        }}
      />
    </section>
  );
}
