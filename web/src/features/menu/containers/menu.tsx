"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import EditMenuItemModal from "../components/organisms/edit-menu-item-modal";
import MenuFilterBar from "../components/organisms/menu-filter-bar";
import MenuItemDetailModal from "../components/organisms/menu-item-detail-modal";
import MenuTable from "../components/organisms/menu-table";
import {
  countMenuItems,
  filterMenuItems,
  matchesAvailability,
  MENU_PAGE_SIZE,
  type ActiveFilter,
  type AvailabilityFilter,
  type MenuItem,
} from "../utils/menu";
import { MOCK_BRANDS, MOCK_MENU_ITEMS, MOCK_MODIFIER_CATALOG, toMenuItem } from "../utils/mock-menu";

const BRAND_ORDER = MOCK_BRANDS.map((brand) => brand.code);

// Placeholder for the brand's recipe list: the recipes its items already use.
function brandRecipes(items: MenuItem[], brandCode: string) {
  return [...new Set(items.filter((item) => item.brand.code === brandCode).map((item) => item.recipe))].sort();
}

// Every brand by default: in a shared kitchen one shortage takes items off
// several menus at once, and this is where staff look for what's off. Picking
// a brand narrows the same table, and the URL keeps it (?brand=GC) so someone
// who runs one brand can bookmark their view.
export default function MenuPage() {
  // Placeholder data until the menu items API is wired up; toggles last until reload.
  const [items, setItems] = useState<MenuItem[]>(() => MOCK_MENU_ITEMS.map((r) => toMenuItem(r, MOCK_BRANDS)));

  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand")?.toUpperCase();
  const brand = brandParam && BRAND_ORDER.includes(brandParam) ? brandParam : undefined;

  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [active, setActive] = useState<ActiveFilter | undefined>("active");
  const search = useDebouncedValue(query.trim());

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const viewing = items.find((item) => item.id === viewingId) ?? null;

  const updateItem = (id: string, patch: Partial<MenuItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  // Any filter change returns to page 1 and forgets which rows were just toggled.
  const filterKey = `${brand ?? ""}|${availability}|${active ?? ""}|${search}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  const [toggled, setToggled] = useState({ filterKey, ids: new Set<string>() });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  if (toggled.filterKey !== filterKey) setToggled({ filterKey, ids: new Set() });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  function setBrand(code: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (code) params.set("brand", code);
    else params.delete("brand");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }

  function setItemAvailability(target: MenuItem, available: boolean) {
    setItems((current) => current.map((item) => (item.id === target.id ? { ...item, available } : item)));
    // A row flipped while "Available" or "Unavailable" is picked stays put
    // instead of vanishing under the pointer.
    setToggled((current) => ({ filterKey: current.filterKey, ids: new Set(current.ids).add(target.id) }));
  }

  const filters = { search, brand, availability, active };
  const rows = filterMenuItems(items, { ...filters, availability: "all" }, BRAND_ORDER).filter(
    (item) => matchesAvailability(item, availability) || toggled.ids.has(item.id),
  );
  const counts = countMenuItems(items, filters);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / MENU_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * MENU_PAGE_SIZE, currentPage * MENU_PAGE_SIZE);

  const filtered = Boolean(query.trim() || brand || availability !== "all" || active !== "active");
  const emptyMessage = filtered ? "No menu items match these filters." : "No menu items yet.";

  return (
    <section className="motion-safe:animate-page-in">
      <PageTitle>Menu & availability</PageTitle>

      <MenuFilterBar
        query={query}
        onQueryChange={setQuery}
        active={active}
        onActiveChange={setActive}
        brands={MOCK_BRANDS}
        brand={brand}
        onBrandChange={setBrand}
        availability={availability}
        onAvailabilityChange={setAvailability}
        counts={counts}
        resultCount={total}
        onClear={
          filtered
            ? () => {
                setQuery("");
                setBrand(undefined);
                setAvailability("all");
                setActive("active");
              }
            : undefined
        }
      />

      <MenuTable
        items={pageRows}
        showBrand={!brand}
        onAvailabilityChange={setItemAvailability}
        onView={(item) => {
          setViewingId(item.id);
          setModalOpen(true);
        }}
        emptyMessage={emptyMessage}
        footer={
          total > 0 ? (
            <Pagination
              page={currentPage}
              pageSize={MENU_PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              onPageChange={(next) => setPaging({ filterKey, page: next })}
            />
          ) : null
        }
      />

      <MenuItemDetailModal
        item={viewing}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAvailabilityChange={setItemAvailability}
        onEdit={() => {
          setModalOpen(false);
          setEditOpen(true);
        }}
        // The modal stays open and now reads "Inactive", with Reactivate in place of Edit.
        onDeactivate={(target) => updateItem(target.id, { active: false })}
        onReactivate={(target) => updateItem(target.id, { active: true })}
      />

      <EditMenuItemModal
        item={viewing}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setModalOpen(true); // cancel goes back to the item's details
        }}
        onSaved={(saved) => {
          setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)));
          setEditOpen(false);
          setModalOpen(true); // the details show what was saved
        }}
        recipes={viewing ? brandRecipes(items, viewing.brand.code) : []}
        modifierCatalog={MOCK_MODIFIER_CATALOG}
        takenCodes={new Set(items.filter((item) => item.id !== viewingId).map((item) => item.code))}
      />
    </section>
  );
}
