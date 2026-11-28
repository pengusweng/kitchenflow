"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Pagination from "@/src/components/ui/molecules/pagination";
import PageTitle from "@/src/features/dashboard/components/atoms/page-title";
import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import { replaceSearchParams } from "@/src/lib/search-params";
import OrderDetailModal from "../components/organisms/order-detail-modal";
import OrdersFilterBar from "../components/organisms/orders-filter-bar";
import OrdersTable from "../components/organisms/orders-table";
import { useBrandOptions, useOrder, useOrderPayment, useOrders } from "../hooks/useOrders";
import { useTodayInManila } from "../hooks/useTodayInManila";
import {
  ORDERS_PAGE_SIZE,
  toOrderDetail,
  toOrderSummary,
  type OrderStatusFilter,
  type OrderSummary,
  type PaymentStatus,
} from "../utils/orders";

const VALID_STATUS = new Set<OrderStatusFilter>(["all", "DRAFT", "CONFIRMED", "PREPARING", "COMPLETED", "CANCELLED"]);
const VALID_PAYMENT = new Set<PaymentStatus>(["PAID", "UNPAID", "REFUNDED"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const NO_COUNTS: Record<OrderStatusFilter, number> = {
  all: 0,
  DRAFT: 0,
  CONFIRMED: 0,
  PREPARING: 0,
  COMPLETED: 0,
  CANCELLED: 0,
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim());
  const today = useTodayInManila();

  const rawStatus = searchParams.get("status")?.toUpperCase();
  const status: OrderStatusFilter = rawStatus && VALID_STATUS.has(rawStatus as OrderStatusFilter) ? (rawStatus as OrderStatusFilter) : "all";
  const rawPayment = searchParams.get("payment")?.toUpperCase();
  const payment: PaymentStatus | undefined = rawPayment && VALID_PAYMENT.has(rawPayment as PaymentStatus) ? (rawPayment as PaymentStatus) : undefined;
  const brand = searchParams.get("brand") || undefined;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const dates: { from?: string; to?: string } = {
    ...(fromParam && DATE_RE.test(fromParam) ? { from: fromParam } : {}),
    ...(toParam && DATE_RE.test(toParam) ? { to: toParam } : {}),
  };

  function setStatus(next: OrderStatusFilter) {
    replaceSearchParams(searchParams, (params) => {
      if (next === "all") params.delete("status");
      else params.set("status", next);
    });
  }

  function setBrand(next: string | undefined) {
    replaceSearchParams(searchParams, (params) => {
      if (next) params.set("brand", next);
      else params.delete("brand");
    });
  }

  function setPayment(next: PaymentStatus | undefined) {
    replaceSearchParams(searchParams, (params) => {
      if (next) params.set("payment", next);
      else params.delete("payment");
    });
  }

  function setDates(next: { from?: string; to?: string }) {
    replaceSearchParams(searchParams, (params) => {
      if (next.from) params.set("from", next.from);
      else params.delete("from");
      if (next.to) params.set("to", next.to);
      else params.delete("to");
    });
  }

  // Kept after closing so the dialog's content doesn't blank out mid-exit.
  const [viewing, setViewing] = useState<OrderSummary | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Any filter change returns to page 1.
  const filterKey = `${status}|${brand ?? ""}|${payment ?? ""}|${search}|${dates.from ?? ""}|${dates.to ?? ""}`;
  const [paging, setPaging] = useState({ filterKey, page: 1 });
  if (paging.filterKey !== filterKey) setPaging({ filterKey, page: 1 });
  const page = paging.filterKey === filterKey ? paging.page : 1;

  const { data, error, isPending, isPlaceholderData } = useOrders({
    page,
    status: status === "all" ? undefined : status,
    search,
    brandId: brand,
    payment,
    from: dates.from,
    to: dates.to,
  });
  const brands = useBrandOptions();
  const detail = useOrder(viewing, modalOpen);
  const viewingPayment = useOrderPayment(viewing, modalOpen);

  const orders = data?.data.map(toOrderSummary) ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const filtered = Boolean(query.trim() || brand || payment || dates.from || dates.to || status !== "all");

  let emptyMessage = "No orders match these filters.";
  if (error) emptyMessage = error.message;
  else if (!filtered) emptyMessage = "No orders yet.";

  return (
    <section className="motion-safe:animate-page-in">
      <PageTitle>Orders</PageTitle>

      <OrdersFilterBar
        query={query}
        onQueryChange={setQuery}
        brandOptions={brands.data ?? []}
        brand={brand}
        onBrandChange={setBrand}
        payment={payment}
        onPaymentChange={setPayment}
        dates={dates}
        onDatesChange={setDates}
        maxDate={today}
        status={status}
        onStatusChange={setStatus}
        counts={meta?.counts ?? NO_COUNTS}
        resultCount={total}
        onClear={
          filtered
            ? () => {
                setQuery("");
                replaceSearchParams(searchParams, (params) => {
                  params.delete("brand");
                  params.delete("payment");
                  params.delete("from");
                  params.delete("to");
                  params.delete("status");
                });
              }
            : undefined
        }
      />

      <OrdersTable
        orders={orders}
        onView={(order) => {
          setViewing(order);
          setModalOpen(true);
        }}
        loading={isPending}
        refreshing={isPlaceholderData}
        skeletonRows={orders.length || ORDERS_PAGE_SIZE}
        emptyMessage={emptyMessage}
        footer={
          total > 0 ? (
            <Pagination
              page={page}
              pageSize={ORDERS_PAGE_SIZE}
              total={total}
              totalPages={meta?.totalPages ?? 1}
              onPageChange={(next) => setPaging({ filterKey, page: next })}
            />
          ) : null
        }
      />

      <OrderDetailModal
        order={viewing}
        detail={viewing && detail.data ? toOrderDetail(viewing, detail.data) : null}
        error={detail.error?.message ?? null}
        payment={viewingPayment.data ?? null}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onOpenTicket={(ticket) => {
          setModalOpen(false);
          router.push(`/dashboard/kitchen-overview?ticket=${encodeURIComponent(ticket.id)}`);
        }}
      />
    </section>
  );
}
