"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { replaceSearchParams } from "@/src/lib/search-params";
import { Button } from "@/components/ui/button";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { useRecipeBrands } from "@/src/features/recipes/hooks/useRecipeBrands";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import CreateMenuItemModal from "../components/organisms/create-menu-item-modal";
import EditMenuItemModal from "../components/organisms/edit-menu-item-modal";
import MenuFilterBar from "../components/organisms/menu-filter-bar";
import MenuItemDetailModal from "../components/organisms/menu-item-detail-modal";
import MenuTable from "../components/organisms/menu-table";
import { useMenu } from "../hooks/useMenu";
import {
  useCreateMenuItem,
  useSetMenuItemActive,
  useSetMenuItemAvailability,
  useUpdateMenuItem,
} from "../hooks/useMenuMutations";
import type { MenuPage as MenuPageData } from "../schemas/menuSchema";
import {
  MENU_PAGE_SIZE,
  NO_COUNTS,
  toMenuItem,
  type ActiveFilter,
  type AvailabilityFilter,
  type MenuBrand,
  type MenuCounts,
  type MenuItem,
} from "../utils/menu";
import { menuActionError } from "../utils/menu-errors";

/** The API counts brands by id; the brand chips go by code. */
function toCounts(meta: MenuPageData["meta"] | undefined, brands: MenuBrand[]): MenuCounts {
  if (!meta) return NO_COUNTS;
  const none = { total: 0, unavailable: 0 };
  const byCode: MenuCounts["brands"] = { all: meta.counts.brands.all ?? none };
  for (const brand of brands) byCode[brand.code] = meta.counts.brands[brand.id] ?? none;
  return { brands: byCode, availability: meta.counts.availability };
}

type MenuPageProps = {
  /** Superadmins add, edit, deactivate and reactivate items; every role here can switch availability. */
  canManage: boolean;
};

// Every brand by default: in a shared kitchen one shortage takes items off
// several menus at once, and this is where staff look for what's off. Picking
// a brand narrows the same table, and the URL keeps it (?brand=GC) so someone
// who runs one brand can bookmark their view.
export default function MenuPage({ canManage }: MenuPageProps) {
  const { brands: allBrands, activeBrands, brandFor } = useRecipeBrands();

  const searchParams = useSearchParams();
  const brandParam = searchParams.get("brand")?.toUpperCase();
  const brandRecord = brandParam ? allBrands.find((b) => b.code === brandParam) : undefined;
  const brand = brandRecord?.code;

  const availabilityParam = searchParams.get("availability");
  const availability: AvailabilityFilter =
    availabilityParam === "available" || availabilityParam === "unavailable" ? availabilityParam : "all";

  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ActiveFilter | undefined>("active");
  const search = useDebouncedValue(query.trim());

  // Any filter change returns to page 1.
  const filterKey = `${brand ?? ""}|${availability}|${active ?? ""}|${search}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  const menu = useMenu({
    page,
    limit: MENU_PAGE_SIZE,
    status: active,
    availability,
    brandId: brandRecord?.id,
    search: search || undefined,
  });
  const rows = (menu.data?.data ?? []).map((record) => toMenuItem(record, brandFor));
  const counts = toCounts(menu.data?.meta, allBrands);
  const total = menu.data?.meta.total ?? 0;
  const totalPages = Math.max(1, menu.data?.meta.totalPages ?? 1);
  // A retired brand gets a chip only while it still has items to show.
  const chipBrands = allBrands.filter(
    (b) => activeBrands.some((a) => a.id === b.id) || (counts.brands[b.code]?.total ?? 0) > 0,
  );

  // The open item, kept apart from the table so it stays put while the page
  // reloads or after it drops out of the current filter.
  const [viewing, setViewing] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const setItemActive = useSetMenuItemActive();
  const setAvailabilityOf = useSetMenuItemAvailability();
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  function setBrand(code: string | undefined) {
    replaceSearchParams(searchParams, (params) => {
      if (code) params.set("brand", code);
      else params.delete("brand");
    });
  }

  function setAvailability(next: AvailabilityFilter) {
    replaceSearchParams(searchParams, (params) => {
      if (next === "all") params.delete("availability");
      else params.set("availability", next);
    });
  }

  function view(item: MenuItem) {
    setItemActive.reset();
    setAvailabilityError(null);
    setViewing(item);
    setModalOpen(true);
  }

  function setItemAvailability(target: MenuItem, available: boolean) {
    setAvailabilityError(null);
    const patchViewing = (value: boolean) =>
      setViewing((current) => (current?.id === target.id ? { ...current, available: value } : current));
    patchViewing(available);
    setAvailabilityOf.mutate(
      { id: target.id, available },
      {
        onError: (error) => {
          patchViewing(!available);
          setAvailabilityError(`${target.name}: ${menuActionError(error, "availability")}`);
        },
      },
    );
  }

  function changeStatus(target: MenuItem, nextActive: boolean) {
    // The modal stays open and now reads "Inactive", with Reactivate in place of Edit.
    setItemActive.mutate(
      { id: target.id, active: nextActive },
      {
        onSuccess: (record) =>
          setViewing((current) =>
            current?.id === target.id
              ? {
                  ...current,
                  active: record.is_active,
                  available: record.is_available,
                }
              : current,
          ),
      },
    );
  }

  const filtered = Boolean(query.trim() || brand || availability !== "all" || active !== "active");
  let emptyMessage = filtered ? "No menu items match these filters." : "No menu items yet.";
  if (menu.error) emptyMessage = menu.error.message;

  let detailError: string | null = availabilityError;
  if (setItemActive.error)
    detailError = menuActionError(setItemActive.error, setItemActive.variables?.active ? "reactivate" : "deactivate");

  return (
    <section className="motion-safe:animate-page-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Menu & availability</PageTitle>
        {canManage ? (
          <Button size="lg" className="h-10 px-4 font-semibold" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Add menu item
          </Button>
        ) : null}
      </div>

      <MenuFilterBar
        query={query}
        onQueryChange={setQuery}
        active={active}
        onActiveChange={setActive}
        brands={chipBrands}
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

      {availabilityError && !modalOpen ? (
        <div
          role="alert"
          className="mt-4 flex items-start justify-between gap-3 rounded-lg bg-destructive/8 py-2 pr-2 pl-3 text-sm leading-5 text-danger-ink"
        >
          <p className="py-1">{availabilityError}</p>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-danger-ink"
            onClick={() => setAvailabilityError(null)}
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      ) : null}

      <MenuTable
        items={rows}
        showBrand={!brand}
        onAvailabilityChange={setItemAvailability}
        onView={view}
        loading={menu.isPending}
        refreshing={menu.isPlaceholderData}
        emptyMessage={emptyMessage}
        footer={
          total > 0 ? (
            <Pagination
              page={Math.min(page, totalPages)}
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
        canManage={canManage}
        busy={setItemActive.isPending}
        error={detailError}
        onEdit={() => {
          setModalOpen(false);
          setEditOpen(true);
        }}
        onDeactivate={(target) => changeStatus(target, false)}
        onReactivate={(target) => changeStatus(target, true)}
      />

      {canManage ? (
        <>
          <EditMenuItemModal
            item={viewing}
            open={editOpen}
            onOpenChange={(open) => {
              setEditOpen(open);
              if (!open) setModalOpen(true); // cancel goes back to the item's details
            }}
            onSubmit={async (values, photo) => {
              if (!viewing) return;
              const saved = await updateItem.mutateAsync({
                item: viewing,
                values,
                photo,
              });
              setViewing(toMenuItem(saved, brandFor));
              setEditOpen(false);
              setModalOpen(true); // the details show what was saved
            }}
          />

          <CreateMenuItemModal
            open={creating}
            onOpenChange={setCreating}
            brands={activeBrands}
            defaultBrand={brand}
            onSubmit={async (input) => {
              const created = await createItem.mutateAsync(input);
              // Confirm by opening the new item's details.
              setCreating(false);
              view(toMenuItem(created, brandFor));
            }}
          />
        </>
      ) : null}
    </section>
  );
}
