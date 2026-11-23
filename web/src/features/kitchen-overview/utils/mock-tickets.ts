import { MOCK_BRANDS } from "@/src/features/menu/utils/mock-menu";
import type { OrderChannel } from "@/src/features/orders/utils/orders";
import type { KitchenTicket, QcAttempt, QcStatus, TicketItem, TicketStage } from "./tickets";

type Seed = {
  brand: "GC" | "AI" | "KK";
  stage: TicketStage;
  /** Minutes since the order was sent, at the moment the page opened. */
  sent: number;
  /** Handed over only: minutes from the order to the handover. */
  took?: number;
  /** Dine-in unless given. */
  channel?: OrderChannel;
  /** Handed over by delivery only: how many handoff photos were taken. */
  photos?: number;
  /** Each failed QC check, oldest first, as its rejected portions: [item index, portion, checker's note]. */
  qc?: [item: number, portion: number, note: string][][];
  items: [name: string, quantity: number, modifiers?: string[], notes?: string][];
};

// Placeholder tickets until the page is wired to GET /kitchen-ticket. Times are
// relative to when the page opened, so the spread always looks like a real service.
const SEEDS: Seed[] = [
  {
    brand: "AI",
    stage: "HANDED_OVER",
    sent: 68,
    took: 12.5,
    channel: "GRABFOOD",
    photos: 3,
    items: [
      ["Chicken Inasal Paa", 2],
      ["Halo-halo", 2],
    ],
  },
  {
    brand: "GC",
    stage: "HANDED_OVER",
    sent: 61,
    took: 22.3,
    channel: "TAKEAWAY",
    qc: [[[0, 1, "Lettuce wraps and ssamjang missing from the set."]]],
    items: [["Samgyeopsal Set", 1]],
  },
  {
    brand: "KK",
    stage: "HANDED_OVER",
    sent: 54,
    took: 6.8,
    channel: "FOODPANDA",
    photos: 1,
    items: [
      ["Americano", 1],
      ["Ensaymada", 1],
    ],
  },
  { brand: "GC", stage: "HANDED_OVER", sent: 47, took: 14.1, items: [["Bibimbap", 1, ["Fried egg"]]] },
  {
    brand: "AI",
    stage: "HANDED_OVER",
    sent: 39,
    took: 9.4,
    channel: "GRABFOOD",
    photos: 2,
    items: [["Pork BBQ Skewers", 3, [], "Extra sauce on the side."]],
  },
  {
    brand: "GC",
    stage: "PREPARING",
    sent: 27.5,
    items: [
      ["Bibimbap", 2, ["Extra spicy"]],
      ["Mandu", 1],
    ],
  },
  { brand: "AI", stage: "PREPARING", sent: 21.5, items: [["Chicken Inasal Paa", 3, ["Extra chicken oil"]]] },
  {
    brand: "KK",
    stage: "ACKNOWLEDGED",
    sent: 17.5,
    items: [
      ["Iced Spanish Latte", 2, ["Less sugar"]],
      ["Ensaymada", 2, ["Warm it up"]],
    ],
  },
  {
    brand: "GC",
    stage: "REWORKING",
    sent: 12.2,
    qc: [[[0, 1, "No fried egg on top; the order asks for one."]]],
    items: [
      ["Kimchi Fried Rice", 1, ["Fried egg"]],
      ["Kimbap", 1],
    ],
  },
  {
    brand: "AI",
    stage: "FOR_CHECKING",
    sent: 11.4,
    qc: [
      [[0, 2, "Plain rice on this portion; it was upgraded to garlic rice."]],
      [[1, 1, "No leche flan on the halo-halo."]],
    ],
    items: [
      ["Chicken Inasal Pecho", 2, ["Upgrade to garlic rice"]],
      ["Halo-halo", 1],
    ],
  },
  {
    brand: "KK",
    stage: "PREPARING",
    sent: 13.8,
    items: [
      ["Cheese Ramyeon", 1, ["Add cheese"]],
      ["Matcha Latte", 1],
    ],
  },
  { brand: "GC", stage: "CHECKING", sent: 10.6, items: [["Yangnyeom Chicken", 1, ["Extra rice"]]] },
  {
    brand: "AI",
    stage: "REWORKING",
    sent: 6.3,
    qc: [
      [
        [0, 3, "Two skewers on this portion instead of three."],
        [1, 1, "Three shrimp in the bowl; it should have five."],
      ],
    ],
    items: [
      ["Pork BBQ Skewers", 4],
      ["Sinigang na Hipon", 1],
    ],
  },
  { brand: "GC", stage: "FOR_CHECKING", sent: 8.9, items: [["Tteokbokki", 1, ["Add cheese", "Extra spicy"]]] },
  { brand: "KK", stage: "READY", sent: 9.2, items: [["Americano", 2, ["Extra espresso shot"]]] },
  {
    brand: "AI",
    stage: "PREPARING",
    sent: 7.4,
    items: [
      ["Chicken Inasal Paa", 1],
      ["Leche Flan", 1],
    ],
  },
  {
    brand: "GC",
    stage: "ACKNOWLEDGED",
    sent: 4.8,
    items: [
      ["Bulgogi Rice Bowl", 1, ["Fried egg"]],
      ["Hotteok", 2],
    ],
  },
  { brand: "KK", stage: "PREPARING", sent: 5.6, items: [["Iced Spanish Latte", 1, ["Oat milk", "Upsize to 16 oz"]]] },
  { brand: "AI", stage: "READY", sent: 3.9, items: [["Chicken Inasal Pecho", 1, ["Spicy vinegar"]]] },
  {
    brand: "GC",
    stage: "QUEUED",
    sent: 2.3,
    items: [
      ["Sundubu Jjigae", 1, ["Extra rice"]],
      ["Kimchi Pancake", 1],
    ],
  },
  { brand: "KK", stage: "QUEUED", sent: 1.6, items: [["Ensaymada", 3]] },
  {
    brand: "AI",
    stage: "QUEUED",
    sent: 0.9,
    items: [
      ["Pork BBQ Skewers", 6],
      ["Halo-halo", 2],
    ],
  },
  { brand: "GC", stage: "QUEUED", sent: 0.4, items: [["Japchae", 1, [], "No sesame, allergy."]] },
];

const ORDER_START = 209;
const TICKET_START = 82;

/** Builds the mock tickets around the given moment. Oldest orders got the lowest numbers. */
export function mockTickets(anchor: number): KitchenTicket[] {
  const at = (minutesAgo: number) => new Date(anchor - minutesAgo * 60_000).toISOString();
  const byAge = [...SEEDS].sort((a, b) => b.sent - a.sent);
  return byAge.map((seed, index) => {
    const brand = MOCK_BRANDS.find((b) => b.code === seed.brand) ?? MOCK_BRANDS[0];
    // The kitchen picks a ticket up shortly after the order lands, then works it.
    const reached = (stage: TicketStage) => STAGE_ORDER.indexOf(seed.stage) >= STAGE_ORDER.indexOf(stage);
    const items: TicketItem[] = seed.items.map(([name, quantity, modifiers = [], notes], i) => ({
      id: `${index}-${i}`,
      name,
      quantity,
      modifiers,
      notes: notes ?? null,
    }));
    return {
      id: `ticket-${TICKET_START + index}`,
      number: `T-${String(TICKET_START + index).padStart(3, "0")}`,
      orderCode: `${seed.brand}-${String(ORDER_START + index).padStart(4, "0")}`,
      brand,
      channel: seed.channel ?? "DINE_IN",
      stage: seed.stage,
      orderSentAt: at(seed.sent),
      createdAt: at(seed.sent - 0.1),
      acknowledgedAt: reached("ACKNOWLEDGED") ? at(seed.sent * 0.85) : null,
      preparationStartedAt: reached("PREPARING") ? at(seed.sent * 0.7) : null,
      readyAt: reached("READY") ? at(seed.sent * 0.1) : null,
      handedOverAt: null,
      handoffPhotos: Array.from({ length: seed.photos ?? 0 }, (_, i) =>
        placeholderPhoto(i + 1, seed.photos ?? 0, brand.accent),
      ),
      ...(seed.took === undefined ? {} : handedOver(seed.sent, seed.took, at)),
      qcAttempts: qcAttempts(
        seed,
        items,
        index,
        // QC happens between the cook starting and the ticket being ready (or now, if it isn't yet).
        seed.took === undefined
          ? [seed.sent * 0.7, reached("READY") ? seed.sent * 0.1 : 0]
          : [seed.sent - seed.took * 0.3, seed.sent - seed.took * 0.9],
        at,
      ),
      items,
    };
  });
}

const CHECKERS = ["Ana Santos", "Marco Reyes", "Joy Villanueva"];

// The seed's failed checks, then the one the stage implies: still going while
// In QC, passed once it's Ready or later. Spread evenly across the QC window,
// with the rework between a fail and the next check.
function qcAttempts(
  seed: Seed,
  items: TicketItem[],
  ticketIndex: number,
  [from, to]: [number, number],
  at: (minutesAgo: number) => string,
): QcAttempt[] {
  const failed = seed.qc ?? [];
  const last: QcStatus | null =
    seed.stage === "CHECKING"
      ? "IN_PROGRESS"
      : seed.stage === "READY" || seed.stage === "HANDED_OVER"
        ? "PASSED"
        : null;
  const statuses: QcStatus[] = [...failed.map((): QcStatus => "FAILED"), ...(last ? [last] : [])];
  const slot = (from - to) / (statuses.length + 0.5);
  return statuses.map((status, k) => {
    const started = from - slot * (k + 1);
    const done = started - slot * 0.4;
    const id = `qc-${ticketIndex}-${k + 1}`;
    return {
      id,
      number: k + 1,
      status,
      checker: CHECKERS[(ticketIndex + k) % CHECKERS.length],
      startedAt: at(started),
      completedAt: status === "IN_PROGRESS" ? null : at(done),
      rejections: (failed[k] ?? []).map(([item, portion, note], r) => ({
        id: `${id}-${r}`,
        itemId: items[item].id,
        portion,
        reason: "INCOMPLETE" as const,
        note,
        rejectedAt: at(done),
      })),
    };
  });
}

// Stand-ins for the handoff photos until real ones come from the API: plainly
// labelled tiles, so nobody mistakes them for a real bag on a counter.
function placeholderPhoto(n: number, of: number, accent: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
<rect width="1200" height="900" fill="${accent}"/>
<rect width="1200" height="900" fill="#000" fill-opacity="0.28"/>
<g fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(528 300) scale(6)">
<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
<circle cx="12" cy="13" r="3"/>
</g>
<text x="600" y="560" text-anchor="middle" font-family="system-ui, sans-serif" font-size="44" font-weight="600" fill="#fff">Handoff photo ${n} of ${of}</text>
<text x="600" y="616" text-anchor="middle" font-family="system-ui, sans-serif" font-size="30" fill="#fff" fill-opacity="0.8">Placeholder until the kitchen ticket API is wired up</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// A finished ticket's steps, spread across the time it took from order to handover.
function handedOver(sent: number, took: number, at: (minutesAgo: number) => string) {
  return {
    acknowledgedAt: at(sent - took * 0.12),
    preparationStartedAt: at(sent - took * 0.3),
    readyAt: at(sent - took * 0.9),
    handedOverAt: at(sent - took),
  };
}

// Rework sits with preparing: it goes back to the cook before QC again.
const STAGE_ORDER: TicketStage[] = [
  "QUEUED",
  "ACKNOWLEDGED",
  "PREPARING",
  "REWORKING",
  "FOR_CHECKING",
  "CHECKING",
  "READY",
  "HANDED_OVER",
];
