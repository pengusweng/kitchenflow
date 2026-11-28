import { brandAccent } from "@/src/features/recipes/utils/recipes";
import type { BrandResponse } from "@/src/features/brands/schemas/brandSchema";
import {
  elapsedMs,
  FLAG_LABEL,
  flagReason,
  formatElapsed,
  isHandedOver,
  STAGE_LABEL,
  type FlagReason,
  type KitchenTicket,
  type TicketStage,
} from "@/src/features/kitchen-overview/utils/tickets";
import type { WebRole } from "@/src/features/auth/utils/webRoles";
import { todayInManila } from "@/src/features/audit-history/utils/audit";

export type OpenKitchenStage = Exclude<TicketStage, "HANDED_OVER">;

export const OPEN_KITCHEN_STAGES: OpenKitchenStage[] = [
  "QUEUED",
  "ACKNOWLEDGED",
  "PREPARING",
  "REWORKING",
  "FOR_CHECKING",
  "CHECKING",
  "READY",
];

/**
 * Harmonized status palette aligned with KitchenFlow's existing UI tokens
 * (`stage-badge.tsx`, `globals.css`): neutral slates for intake, operational blue
 * for cooking, semantic red for rework, copper for QC queue, violet for active QC,
 * and controlled green for ready.
 */
export const STAGE_BAR_TONE: Record<OpenKitchenStage, string> = {
  QUEUED: "text-[#8794a2] dark:text-[#75869a]",
  ACKNOWLEDGED: "text-[#586a7c] dark:text-[#9babbc]",
  PREPARING: "text-[#386b99] dark:text-[#719ec5]",
  REWORKING: "text-[#ad4640] dark:text-[#ca7871]",
  FOR_CHECKING: "text-[#a66540] dark:text-[#c88f68]",
  CHECKING: "text-[#76588d] dark:text-[#a391b8]",
  READY: "text-[#387e56] dark:text-[#79ac8a]",
};

export type WorkspaceBrand = {
  id: string;
  code: string;
  name: string;
  accent: string;
  logoUrl: string | null;
  isActive: boolean;
};

const PILOT_ORDER: Record<string, number> = {
  GC: 0,
  AI: 1,
  KK: 2,
};

export function toWorkspaceBrands(records: BrandResponse[]): WorkspaceBrand[] {
  return records
    .map((brand) => ({
      id: brand.brand_id,
      code: brand.code.trim().toUpperCase(),
      name: brand.name,
      accent: brandAccent(brand.code),
      logoUrl: brand.logo_url && /^https?:\/\//.test(brand.logo_url) ? brand.logo_url : null,
      isActive: brand.is_active,
    }))
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const aRank = PILOT_ORDER[a.code] ?? 99;
      const bRank = PILOT_ORDER[b.code] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });
}

export function isOrderWorkspaceRole(role: WebRole): boolean {
  return role === "SUPERADMIN" || role === "SUPERVISOR";
}

export function isKitchenWorkspaceRole(role: WebRole): boolean {
  return role === "SUPERADMIN" || role === "SUPERVISOR" || role === "KITCHEN_HEAD";
}

export function isRecipeWorkspaceRole(role: WebRole): boolean {
  return role === "RECIPE_MANAGER";
}

const MANILA_HOUR = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hour12: false,
  timeZone: "Asia/Manila",
});

const BUSINESS_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});

const UPDATED_TIME_FMT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

const UPDATED_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

export function timeGreeting(firstName: string | undefined, nowMs: number | undefined): string {
  const cleanName = firstName?.trim();
  const suffix = cleanName ? `, ${cleanName}` : "";
  if (nowMs === undefined) return `Welcome${suffix}`;

  const hour = Number(MANILA_HOUR.format(new Date(nowMs))) % 24;
  if (hour < 12) return `Good morning${suffix}`;
  if (hour < 18) return `Good afternoon${suffix}`;
  return `Good evening${suffix}`;
}

export function formatBusinessDate(dayIso: string | undefined, nowMs: number | undefined): string | null {
  if (dayIso) {
    const parsed = new Date(`${dayIso}T12:00:00+08:00`);
    if (!Number.isNaN(parsed.getTime())) return BUSINESS_DATE_FMT.format(parsed);
  }
  if (nowMs !== undefined) return BUSINESS_DATE_FMT.format(new Date(nowMs));
  return null;
}

export function formatUpdatedTime(tsMs: number | null, businessDate?: string): string | null {
  if (tsMs === null || !Number.isFinite(tsMs)) return null;
  const updated = new Date(tsMs);
  const time = UPDATED_TIME_FMT.format(updated);
  return businessDate && todayInManila(updated) !== businessDate
    ? `${UPDATED_DATE_FMT.format(updated)}, ${time}`
    : time;
}

export type StageBreakdownRow = {
  stage: OpenKitchenStage;
  label: string;
  count: number;
  exactPct: number;
};

export type FlaggedTicketItem = {
  ticket: KitchenTicket;
  reason: FlagReason;
  reasonLabel: string;
  elapsedMs: number;
  elapsedLabel: string;
};

export type KitchenActivitySummary = {
  totalOpen: number;
  counts: Record<OpenKitchenStage, number>;
  stages: StageBreakdownRow[];
  flaggedTickets: FlaggedTicketItem[];
};

const FLAG_PRIORITY: Record<FlagReason, number> = {
  rework: 0,
  recheck: 1,
  late: 2,
};

export function summarizeKitchenActivity(tickets: KitchenTicket[], now: number): KitchenActivitySummary {
  const counts: Record<OpenKitchenStage, number> = {
    QUEUED: 0,
    ACKNOWLEDGED: 0,
    PREPARING: 0,
    REWORKING: 0,
    FOR_CHECKING: 0,
    CHECKING: 0,
    READY: 0,
  };

  const flaggedTickets: FlaggedTicketItem[] = [];
  let totalOpen = 0;

  for (const ticket of tickets) {
    if (ticket.stage === "HANDED_OVER") continue;
    totalOpen += 1;
    counts[ticket.stage] += 1;

    const reason = flagReason(ticket, now);
    if (reason) {
      const ms = elapsedMs(ticket, now);
      flaggedTickets.push({
        ticket,
        reason,
        reasonLabel: FLAG_LABEL[reason],
        elapsedMs: ms,
        elapsedLabel: formatElapsed(ms),
      });
    }
  }

  flaggedTickets.sort((a, b) => {
    const prioDiff = FLAG_PRIORITY[a.reason] - FLAG_PRIORITY[b.reason];
    if (prioDiff !== 0) return prioDiff;
    const elapsedDiff = b.elapsedMs - a.elapsedMs;
    if (elapsedDiff !== 0) return elapsedDiff;
    return a.ticket.number.localeCompare(b.ticket.number);
  });

  const stages: StageBreakdownRow[] = OPEN_KITCHEN_STAGES.map((stage) => {
    const count = counts[stage];
    const exactPct = totalOpen > 0 ? (count / totalOpen) * 100 : 0;
    return {
      stage,
      label: STAGE_LABEL[stage],
      count,
      exactPct,
    };
  });

  return {
    totalOpen,
    counts,
    stages,
    flaggedTickets,
  };
}

export type BrandOperationRow = {
  brand: WorkspaceBrand;
  activeTickets: number | null;
  unavailableItems: number | null;
};

export function summarizeBrandOperations({
  brands,
  tickets,
  menuBrandCounts,
}: {
  brands: WorkspaceBrand[];
  tickets: KitchenTicket[] | undefined;
  menuBrandCounts: Record<string, { total: number; unavailable: number }> | undefined;
}): BrandOperationRow[] {
  let ticketsByBrand: Record<string, number> | undefined;
  if (tickets) {
    ticketsByBrand = {};
    for (const ticket of tickets) {
      if (isHandedOver(ticket)) continue;
      ticketsByBrand[ticket.brand.id] = (ticketsByBrand[ticket.brand.id] ?? 0) + 1;
    }
  }

  return brands.map((brand) => ({
    brand,
    activeTickets: ticketsByBrand ? (ticketsByBrand[brand.id] ?? 0) : null,
    unavailableItems: menuBrandCounts ? (menuBrandCounts[brand.id]?.unavailable ?? 0) : null,
  }));
}

export function ordersHref({
  from,
  to,
  payment,
}: {
  from?: string;
  to?: string;
  payment?: "PAID" | "UNPAID" | "REFUNDED";
} = {}): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (payment) params.set("payment", payment);
  const qs = params.toString();
  return qs ? `/dashboard/orders?${qs}` : "/dashboard/orders";
}

export function kitchenHref({
  day,
  brandCode,
  stage,
  ticketId,
}: {
  day?: string;
  brandCode?: string;
  stage?: TicketStage;
  ticketId?: string;
} = {}): string {
  const params = new URLSearchParams();
  if (day) params.set("day", day);
  if (brandCode) params.set("brand", brandCode);
  if (stage) params.set("stage", stage);
  if (ticketId) params.set("ticket", ticketId);
  const qs = params.toString();
  return qs ? `/dashboard/kitchen-overview?${qs}` : "/dashboard/kitchen-overview";
}

export function menuHref({
  brandCode,
  availability,
}: {
  brandCode?: string;
  availability?: "available" | "unavailable";
} = {}): string {
  const params = new URLSearchParams();
  if (brandCode) params.set("brand", brandCode);
  if (availability) params.set("availability", availability);
  const qs = params.toString();
  return qs ? `/dashboard/menu?${qs}` : "/dashboard/menu";
}

export function recipesHref({
  brandCode,
  status,
}: {
  brandCode?: string;
  status?: "all" | "active" | "inactive";
} = {}): string {
  const params = new URLSearchParams();
  if (brandCode) params.set("brand", brandCode);
  if (status) params.set("status", status);
  const qs = params.toString();
  return qs ? `/dashboard/recipes?${qs}` : "/dashboard/recipes";
}
