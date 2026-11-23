import { MOCK_BRANDS } from "@/src/features/menu/utils/mock-menu";
import type { KitchenTicket, TicketItem, TicketStage } from "./tickets";

type Seed = {
  brand: "GC" | "AI" | "KK";
  stage: TicketStage;
  /** Minutes since the order was sent, at the moment the page opened. */
  sent: number;
  /** Handed over only: minutes from the order to the handover. */
  took?: number;
  qcFailures?: number;
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
    items: [
      ["Chicken Inasal Paa", 2],
      ["Halo-halo", 2],
    ],
  },
  { brand: "GC", stage: "HANDED_OVER", sent: 61, took: 22.3, qcFailures: 1, items: [["Samgyeopsal Set", 1]] },
  {
    brand: "KK",
    stage: "HANDED_OVER",
    sent: 54,
    took: 6.8,
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
    qcFailures: 1,
    items: [
      ["Kimchi Fried Rice", 1, ["Fried egg"], "Egg was missing on the first pass."],
      ["Kimbap", 1],
    ],
  },
  {
    brand: "AI",
    stage: "FOR_CHECKING",
    sent: 11.4,
    qcFailures: 1,
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
    qcFailures: 1,
    items: [
      ["Pork BBQ Skewers", 4],
      ["Sinigang na Hipon", 1, [], "Broth too salty; remake."],
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
      stage: seed.stage,
      orderSentAt: at(seed.sent),
      createdAt: at(seed.sent - 0.1),
      acknowledgedAt: reached("ACKNOWLEDGED") ? at(seed.sent * 0.85) : null,
      preparationStartedAt: reached("PREPARING") ? at(seed.sent * 0.7) : null,
      readyAt: reached("READY") ? at(seed.sent * 0.1) : null,
      handedOverAt: null,
      ...(seed.took === undefined ? {} : handedOver(seed.sent, seed.took, at)),
      qcFailures: seed.qcFailures ?? 0,
      items,
    };
  });
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
