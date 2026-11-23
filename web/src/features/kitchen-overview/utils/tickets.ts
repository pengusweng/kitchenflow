import type { MenuBrand } from "@/src/features/menu/utils/menu";

/** A ticket still on the line; mirrors the server's KitchenTicketStatus minus HANDED_OVER and CANCELLED. */
export type TicketStage = "QUEUED" | "ACKNOWLEDGED" | "PREPARING" | "REWORKING" | "FOR_CHECKING" | "CHECKING" | "READY";

export const TICKET_STAGES: TicketStage[] = [
  "QUEUED",
  "ACKNOWLEDGED",
  "PREPARING",
  "REWORKING",
  "FOR_CHECKING",
  "CHECKING",
  "READY",
];

export const STAGE_LABEL: Record<TicketStage, string> = {
  QUEUED: "Queued",
  ACKNOWLEDGED: "Acknowledged",
  PREPARING: "Preparing",
  REWORKING: "Rework",
  FOR_CHECKING: "Waiting for QC",
  CHECKING: "In QC",
  READY: "Ready",
};

export type TicketItem = {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  modifiers: string[];
};

export type KitchenTicket = {
  id: string;
  /** e.g. "T-012". */
  number: string;
  orderCode: string;
  brand: MenuBrand;
  stage: TicketStage;
  /** When the cashier sent the order to the kitchen; the clock every ticket is judged by. */
  orderSentAt: string;
  createdAt: string;
  /** Null until that step happens. */
  acknowledgedAt: string | null;
  preparationStartedAt: string | null;
  readyAt: string | null;
  handedOverAt: string | null;
  /** Failed QC attempts so far; a ticket back at Waiting for QC after one is a recheck. */
  qcFailures: number;
  items: TicketItem[];
};

/** Amber from here. */
export const CAUTION_MIN = 10;
/** Red from here. */
export const LATE_MIN = 15;
/** The bar is full at this many minutes. */
export const BAR_SPAN_MIN = 20;
export const TICKETS_PAGE_SIZE = 15;

const MINUTE = 60_000;

export function elapsedMs(ticket: KitchenTicket, now: number) {
  return Math.max(0, now - Date.parse(ticket.orderSentAt));
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
  if (ageTone(elapsedMs(ticket, now)) === "late") return "late";
  if (ticket.stage === "REWORKING") return "rework";
  if (isRecheck(ticket)) return "recheck";
  return null;
}

export function isRecheck(ticket: KitchenTicket) {
  return ticket.stage === "FOR_CHECKING" && ticket.qcFailures > 0;
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
  stage: TicketStage | undefined;
};

/** The tickets that match, flagged ones first, then whoever has waited longest. */
export function filterTickets(tickets: KitchenTicket[], filters: TicketFilters, now: number) {
  const terms = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
  return tickets
    .filter((ticket) => !filters.brand || ticket.brand.code === filters.brand)
    .filter((ticket) => !filters.stage || ticket.stage === filters.stage)
    .filter((ticket) => {
      const haystack = `${ticket.number} ${ticket.orderCode}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => {
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
