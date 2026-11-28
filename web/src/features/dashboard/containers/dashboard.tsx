"use client";

import {
  AlertTriangle,
  Archive,
  BookOpen,
  CircleCheck,
  CircleOff,
  Clock3,
  Flame,
  ReceiptText,
} from "lucide-react";
import { isWebRole, type WebRole } from "@/src/features/auth/utils/webRoles";
import PageTitle from "../components/atoms/page-title";
import SummaryStrip, { type SummaryStripItem } from "../components/molecules/summary-strip";
import WorkspaceHeader from "../components/molecules/workspace-header";
import BrandOperationsSection from "../components/organisms/brand-operations-section";
import KitchenActivityPanel from "../components/organisms/kitchen-activity-panel";
import NeedsAttentionPanel from "../components/organisms/needs-attention-panel";
import RecentRecipesPanel from "../components/organisms/recent-recipes-panel";
import { useWorkspaceData, type WorkspaceData } from "../hooks/useWorkspaceData";
import { formatRole } from "../utils/formatRole";
import {
  formatBusinessDate,
  formatUpdatedTime,
  kitchenHref,
  menuHref,
  ordersHref,
  recipesHref,
  timeGreeting,
} from "../utils/workspace";

type WorkspacePageProps = {
  firstName: string;
  role: string;
};

function buildSummaryItems(role: WebRole, data: WorkspaceData): { label: string; items: SummaryStripItem[] } {
  if (role === "RECIPE_MANAGER") {
    return {
      label: "Recipe overview",
      items: [
        {
          id: "total-recipes",
          label: "Total recipes",
          icon: BookOpen,
          value: data.recipes.total.value,
          isLoading: data.recipes.total.isLoading,
          isError: data.recipes.total.isError,
          href: recipesHref({ status: "all" }),
        },
        {
          id: "active-recipes",
          label: "Active",
          icon: CircleCheck,
          value: data.recipes.active.value,
          isLoading: data.recipes.active.isLoading,
          isError: data.recipes.active.isError,
          href: recipesHref({ status: "active" }),
        },
        {
          id: "inactive-recipes",
          label: "Inactive",
          icon: Archive,
          value: data.recipes.inactive.value,
          isLoading: data.recipes.inactive.isLoading,
          isError: data.recipes.inactive.isError,
          href: recipesHref({ status: "inactive" }),
          tone: "muted",
        },
      ],
    };
  }

  if (role === "KITCHEN_HEAD") {
    const kitchenError = Boolean(data.kitchen.error) && !data.kitchen.summary;
    return {
      label: "Kitchen summary",
      items: [
        {
          id: "active-tickets",
          label: "Active tickets",
          icon: Flame,
          value: data.kitchen.summary ? data.kitchen.summary.totalOpen : null,
          isLoading: data.kitchen.isLoading,
          isError: kitchenError,
          href: kitchenHref({ day: data.today }),
        },
        {
          id: "needs-attention",
          label: "Needs attention",
          icon: AlertTriangle,
          value: data.kitchen.summary ? data.kitchen.summary.flaggedTickets.length : null,
          isLoading: data.kitchen.isLoading,
          isError: kitchenError,
          href: kitchenHref({ day: data.today }),
          tone: "attention",
        },
        {
          id: "unavailable-items",
          label: "Unavailable items",
          icon: CircleOff,
          value: data.unavailableItems.value,
          isLoading: data.unavailableItems.isLoading,
          isError: data.unavailableItems.isError,
          href: menuHref({ availability: "unavailable" }),
          tone: "attention",
        },
      ],
    };
  }

  const from = data.today;
  const to = data.today;
  return {
    label: "Today's orders",
    items: [
      {
        id: "orders-today",
        label: "Orders today",
        icon: ReceiptText,
        value: data.orders.total.value,
        isLoading: data.orders.total.isLoading,
        isError: data.orders.total.isError,
        href: ordersHref({ from, to }),
      },
      {
        id: "paid-orders",
        label: "Paid orders",
        icon: CircleCheck,
        value: data.orders.paid.value,
        isLoading: data.orders.paid.isLoading,
        isError: data.orders.paid.isError,
        href: ordersHref({ from, to, payment: "PAID" }),
      },
      {
        id: "unpaid-orders",
        label: "Unpaid orders",
        icon: Clock3,
        value: data.orders.unpaid.value,
        isLoading: data.orders.unpaid.isLoading,
        isError: data.orders.unpaid.isError,
        href: ordersHref({ from, to, payment: "UNPAID" }),
        tone: "attention",
      },
    ],
  };
}

function AuthorizedWorkspace({ firstName, role }: { firstName: string; role: WebRole }) {
  const data = useWorkspaceData(role);
  const greeting = timeGreeting(firstName, data.now);
  const businessDate = formatBusinessDate(data.today, data.now);
  const updatedTime = formatUpdatedTime(data.lastUpdatedAt, data.today);
  const summary = buildSummaryItems(role, data);
  const roleLabel = formatRole(role);

  const kitchenSection = (
    <div className="grid gap-4 min-[1180px]:grid-cols-2 min-[1180px]:items-start xl:gap-5">
      <KitchenActivityPanel
        summary={data.kitchen.summary}
        day={data.today}
        streamStatus={data.kitchen.streamStatus}
        isLoading={data.kitchen.isLoading}
        error={data.kitchen.error}
        onRetry={data.refreshAll}
      />
      <NeedsAttentionPanel
        flaggedTickets={data.kitchen.summary?.flaggedTickets ?? []}
        day={data.today}
        streamStatus={data.kitchen.streamStatus}
        hasData={data.kitchen.summary !== null}
        isLoading={data.kitchen.isLoading}
        error={data.kitchen.error}
        onRetry={data.refreshAll}
      />
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <WorkspaceHeader
        greeting={greeting}
        roleLabel={roleLabel}
        businessDate={businessDate}
        day={data.today}
        updatedTime={updatedTime}
        lastUpdatedAt={data.lastUpdatedAt}
        isRefreshing={data.isRefreshing}
        onRefresh={data.refreshAll}
      />

      <SummaryStrip label={summary.label} items={summary.items} />

      {role === "RECIPE_MANAGER" ? (
        <>
          <RecentRecipesPanel
            recipes={data.recipes.recent}
            isLoading={data.recipes.recentLoading}
            error={data.recipes.recentError}
            onRetry={data.refreshAll}
          />
          <BrandOperationsSection
            mode="recipes"
            rows={data.recipes.byBrand}
            brandsLoading={data.brandsLoading}
            brandsError={data.brandsError}
            onRetry={data.refreshAll}
          />
        </>
      ) : role === "KITCHEN_HEAD" ? (
        <>
          {kitchenSection}
          <BrandOperationsSection
            mode="operations"
            day={data.today}
            rows={data.brandOperations}
            brandsLoading={data.brandsLoading}
            brandsError={data.brandsError}
            kitchenLoading={data.kitchen.isLoading}
            kitchenError={Boolean(data.kitchen.error) && !data.kitchen.summary}
            menuLoading={data.unavailableItems.isLoading}
            menuError={data.unavailableItems.isError}
            onRetry={data.refreshAll}
          />
        </>
      ) : (
        <>
          <BrandOperationsSection
            mode="operations"
            day={data.today}
            rows={data.brandOperations}
            brandsLoading={data.brandsLoading}
            brandsError={data.brandsError}
            kitchenLoading={data.kitchen.isLoading}
            kitchenError={Boolean(data.kitchen.error) && !data.kitchen.summary}
            menuLoading={data.unavailableItems.isLoading}
            menuError={data.unavailableItems.isError}
            onRetry={data.refreshAll}
          />
          {kitchenSection}
        </>
      )}
    </div>
  );
}

export default function WorkspacePage({ firstName, role }: WorkspacePageProps) {
  if (!isWebRole(role)) {
    return (
      <section className="mx-auto w-full max-w-6xl space-y-4 motion-safe:animate-page-in">
        <PageTitle>Workspace</PageTitle>
        <div className="rounded-xl border border-hairline bg-card px-5 py-4 text-sm text-danger-ink">
          Your role does not have access to the Management Workspace.
        </div>
      </section>
    );
  }

  return <AuthorizedWorkspace firstName={firstName} role={role} />;
}
