import type { MenuBrand } from "@/src/features/menu/utils/menu";
import type { OrderChannel } from "@/src/features/orders/utils/orders";

/** Mirrors the server's KitchenTicketStatus, minus CANCELLED. Everything before HANDED_OVER is still open. */
export type TicketStage =
  "QUEUED" | "ACKNOWLEDGED" | "PREPARING" | "REWORKING" | "FOR_CHECKING" | "CHECKING" | "READY" | "HANDED_OVER";

export const TICKET_STAGES: TicketStage[] = [
  "QUEUED",
  "ACKNOWLEDGED",
  "PREPARING",
  "REWORKING",
  "FOR_CHECKING",
  "CHECKING",
  "READY",
  "HANDED_OVER",
];

export const STAGE_LABEL: Record<TicketStage, string> = {
  QUEUED: "Queued",
  ACKNOWLEDGED: "Acknowledged",
  PREPARING: "Preparing",
  REWORKING: "Rework",
  FOR_CHECKING: "Waiting for QC",
  CHECKING: "In QC",
  READY: "Ready",
  HANDED_OVER: "Handed over",
};

/** Handed over: off the line, so its clock has stopped and it never needs attention. */
export const isHandedOver = (ticket: KitchenTicket) => ticket.stage === "HANDED_OVER";

export type TicketItem = {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  modifiers: string[];
};

/** Mirrors KitchenTicketQcStatus. */
export type QcStatus = "IN_PROGRESS" | "PASSED" | "FAILED";

/** Mirrors QcRejectionReason; the checker's note carries the detail. */
export type QcRejectionReason = "INCOMPLETE";

export const QC_REJECTION_LABEL: Record<QcRejectionReason, string> = { INCOMPLETE: "Incomplete" };

/** One rejected portion, as OrderItemQcRejection stores it. */
export type QcRejection = {
  id: string;
  /** The ticket item it belongs to (order_item_id). */
  itemId: string;
  /** Which of the item's portions, from 1. */
  portion: number;
  reason: QcRejectionReason;
  note: string;
  rejectedAt: string;
};

/** One pass through QC, as KitchenTicketQcAttempt stores it. A recheck is a new attempt. */
export type QcAttempt = {
  id: string;
  /** From 1. */
  number: number;
  status: QcStatus;
  /** The checker's display name. */
  checker: string;
  startedAt: string;
  /** Null while it's still being checked. */
  completedAt: string | null;
  /** Rejected portions only; a pass has none. */
  rejections: QcRejection[];
};

export type KitchenTicket = {
  id: string;
  /** e.g. "T-012". */
  number: string;
  orderCode: string;
  brand: MenuBrand;
  /** Where the order came from; delivery handoffs are photographed for the rider. */
  channel: OrderChannel;
  stage: TicketStage;
  /** When the cashier sent the order to the kitchen; the clock every ticket is judged by. */
  orderSentAt: string;
  createdAt: string;
  /** Null until that step happens. */
  acknowledgedAt: string | null;
  preparationStartedAt: string | null;
  readyAt: string | null;
  handedOverAt: string | null;
  /** Failed QC checks so far; a ticket back at Waiting for QC after one is a recheck. */
  qcFailureCount: number;
  items: TicketItem[];
};

/** Data the modal loads on its own once a ticket is open. */
export type Loadable<T> = { data?: T; loading: boolean; error?: string };

/** GrabFood and foodpanda orders leave with a rider, so their handoff is photographed. */
export function isDelivery(channel: OrderChannel) {
  return channel === "GRABFOOD" || channel === "FOODPANDA";
}

/** Handoff photos belong to handed-over delivery tickets; dine-in and takeaway are handed over in person. */
export function showsHandoffPhotos(ticket: KitchenTicket) {
  return ticket.stage === "HANDED_OVER" && isDelivery(ticket.channel);
}

/** Amber from here. */
export const CAUTION_MIN = 10;
/** Red from here. */
export const LATE_MIN = 15;
/** The bar is full at this many minutes. */
export const BAR_SPAN_MIN = 20;
export const TICKETS_PAGE_SIZE = 15;

const MINUTE = 60_000;

/** Time since the order was sent, stopped at the handover once there is one. */
export function elapsedMs(ticket: KitchenTicket, now: number) {
  const end = ticket.handedOverAt ? Date.parse(ticket.handedOverAt) : now;
  return Math.max(0, end - Date.parse(ticket.orderSentAt));
}

export type AgeTone = "normal" | "caution" | "late";

export function ageTone(ms: number): AgeTone {
  if (ms >= LATE_MIN * MINUTE) return "late";
  if (ms >= CAUTION_MIN * MINUTE) return "caution";
  return "normal";
}

export type FlagReason = "late" | "rework" | "recheck";

/** Why a ticket needs someone's attention, or null when it's on track. Lateness wins: it's the one that keeps growing. */
export function flagReason(ticket: KitchenTicket, now: number): FlagReason | null {
  if (isHandedOver(ticket)) return null;
  if (ageTone(elapsedMs(ticket, now)) === "late") return "late";
  if (ticket.stage === "REWORKING") return "rework";
  if (isRecheck(ticket)) return "recheck";
  return null;
}

export function isRecheck(ticket: KitchenTicket) {
  return ticket.stage === "FOR_CHECKING" && ticket.qcFailureCount > 0;
}

/** Stages a ticket only reaches by going through QC, so it has a QC history to show. */
const PAST_QC: TicketStage[] = ["CHECKING", "REWORKING", "READY", "HANDED_OVER"];

export function hasQcHistory(ticket: KitchenTicket) {
  return ticket.qcFailureCount > 0 || PAST_QC.includes(ticket.stage);
}

const TIMES = ["once", "twice"];
/** "once", "twice", "3 times". */
export function timesWord(n: number) {
  return TIMES[n - 1] ?? `${n} times`;
}

/** One line on how QC has gone, for the button that opens the full history. Attempts first one first. */
export function qcSummary(attempts: QcAttempt[]) {
  const failed = attempts.filter((attempt) => attempt.status === "FAILED").length;
  const last = attempts.at(-1);
  const checks = `${attempts.length} ${attempts.length === 1 ? "check" : "checks"}`;
  if (!last) return "Not checked yet";
  if (last.status === "IN_PROGRESS") return failed ? `Being rechecked · failed ${timesWord(failed)}` : "Being checked";
  if (last.status === "PASSED")
    return failed ? `Passed on check ${last.number} · failed ${timesWord(failed)}` : "Passed first time";
  return `${checks} · failed ${timesWord(failed)}`;
}

/** How long a check took, or has been going: "Under a minute", "3 min". */
export function formatDuration(ms: number) {
  const min = Math.round(ms / 60_000);
  return min < 1 ? "Under a minute" : `${min} min`;
}

export const FLAG_LABEL: Record<FlagReason, string> = {
  late: `Open ${LATE_MIN} minutes or more`,
  rework: "In rework",
  recheck: "Waiting for a QC recheck",
};

/** 7:05, 27:32, then 1:02:09 past the hour. */
export function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

export type TicketFilters = {
  search: string;
  /** Brand code. */
  brand: string | undefined;
  /** Undefined means every open stage; handed-over tickets only show when asked for, or with `withHandedOver`. */
  stage: TicketStage | undefined;
  /** With no stage picked, list handed-over tickets too (after the open ones), as for a past day. */
  withHandedOver?: boolean;
};

/**
 * The tickets that match: open ones flagged first, then whoever has waited
 * longest; then handed-over ones, most recently handed over first.
 */
export function filterTickets(tickets: KitchenTicket[], filters: TicketFilters, now: number) {
  const terms = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
  return tickets
    .filter((ticket) => !filters.brand || ticket.brand.code === filters.brand)
    .filter((ticket) =>
      filters.stage ? ticket.stage === filters.stage : filters.withHandedOver || !isHandedOver(ticket),
    )
    .filter((ticket) => {
      const haystack = `${ticket.number} ${ticket.orderCode}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => {
      const closed = Number(isHandedOver(a)) - Number(isHandedOver(b));
      if (closed) return closed;
      if (a.handedOverAt && b.handedOverAt) return Date.parse(b.handedOverAt) - Date.parse(a.handedOverAt);
      const flagged = Number(flagReason(b, now) !== null) - Number(flagReason(a, now) !== null);
      return flagged || Date.parse(a.orderSentAt) - Date.parse(b.orderSentAt);
    });
}

export function countFlagged(tickets: KitchenTicket[], now: number) {
  return tickets.filter((ticket) => flagReason(ticket, now) !== null).length;
}

const TIME = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
const DATE = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });

export function formatTicketTime(iso: string) {
  const date = new Date(iso);
  return { date: DATE.format(date), time: TIME.format(date) };
}

export type TimelineStep = {
  key: "sent" | "created" | "acknowledged" | "cooking" | "ready" | "handedOver";
  label: string;
  /** Null for a step the ticket hasn't reached yet. */
  at: string | null;
};

/** The ticket's path from order to pass, reached steps with their times and the rest still to come. */
export function ticketTimeline(ticket: KitchenTicket): TimelineStep[] {
  return [
    { key: "sent", label: "Order sent", at: ticket.orderSentAt },
    { key: "created", label: "Ticket created", at: ticket.createdAt },
    { key: "acknowledged", label: "Acknowledged", at: ticket.acknowledgedAt },
    { key: "cooking", label: "Started cooking", at: ticket.preparationStartedAt },
    { key: "ready", label: "Ready", at: ticket.readyAt },
    { key: "handedOver", label: "Handed over", at: ticket.handedOverAt },
  ];
}

/** How long a step took after the one before it, said the way the line would say it. */
export function formatGap(ms: number) {
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 1) return "Right away";
  return `${minutes} min later`;
}
