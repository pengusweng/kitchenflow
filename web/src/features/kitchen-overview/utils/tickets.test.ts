import { describe, expect, test } from "vitest";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import { mockTickets } from "./mock-tickets";
import {
  ageTone,
  elapsedMs,
  countFlagged,
  filterTickets,
  flagReason,
  formatElapsed,
  formatGap,
  qcFailures,
  qcSummary,
  type QcAttempt,
  type QcStatus,
  showsHandoffPhotos,
  ticketTimeline,
  type KitchenTicket,
  type TicketStage,
} from "./tickets";

const NOW = Date.parse("2026-11-23T08:00:00.000Z");
const MIN = 60_000;
const GC: MenuBrand = { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#3D5A80" };
const AI: MenuBrand = { id: "b-ai", code: "AI", name: "Aurelia's Inasal", accent: "#9A4A1F" };

function attempt(number: number, status: QcStatus): QcAttempt {
  const at = new Date(NOW - (10 - number) * MIN).toISOString();
  return {
    id: `qc-${number}`,
    number,
    status,
    checker: "Ana Santos",
    startedAt: at,
    completedAt: status === "IN_PROGRESS" ? null : at,
    rejections: [],
  };
}

function ticket(
  number: string,
  sentMsAgo: number,
  stage: TicketStage = "PREPARING",
  extra: Partial<KitchenTicket> = {},
) {
  const sent = new Date(NOW - sentMsAgo).toISOString();
  return {
    id: number,
    number,
    orderCode: `GC-${number}`,
    brand: GC,
    stage,
    orderSentAt: sent,
    createdAt: sent,
    acknowledgedAt: null,
    preparationStartedAt: null,
    readyAt: null,
    handedOverAt: null,
    channel: "DINE_IN",
    handoffPhotos: [],
    qcAttempts: [],
    items: [],
    ...extra,
  } satisfies KitchenTicket;
}

describe("flagReason", () => {
  test("turns late at exactly 15 minutes", () => {
    expect(flagReason(ticket("T-1", 15 * MIN - 1000), NOW)).toBeNull();
    expect(flagReason(ticket("T-1", 15 * MIN), NOW)).toBe("late");
  });

  test("rework is flagged however fresh it is", () => {
    expect(flagReason(ticket("T-2", MIN, "REWORKING"), NOW)).toBe("rework");
  });

  test("waiting for QC is only a recheck after a failed attempt", () => {
    expect(flagReason(ticket("T-3", MIN, "FOR_CHECKING"), NOW)).toBeNull();
    expect(flagReason(ticket("T-3", MIN, "FOR_CHECKING", { qcAttempts: [attempt(1, "FAILED")] }), NOW)).toBe("recheck");
  });

  test("lateness wins over rework", () => {
    expect(flagReason(ticket("T-4", 20 * MIN, "REWORKING"), NOW)).toBe("late");
  });
});

test("ageTone is amber from 10 minutes and red from 15", () => {
  expect(ageTone(10 * MIN - 1)).toBe("normal");
  expect(ageTone(10 * MIN)).toBe("caution");
  expect(ageTone(15 * MIN)).toBe("late");
});

test("formatElapsed pads seconds and adds hours past the hour", () => {
  expect(formatElapsed(7 * MIN + 5000)).toBe("7:05");
  expect(formatElapsed(27 * MIN + 32_000)).toBe("27:32");
  expect(formatElapsed(62 * MIN + 9000)).toBe("1:02:09");
});

describe("filterTickets", () => {
  const tickets = [
    ticket("T-010", 2 * MIN),
    ticket("T-011", 9 * MIN),
    ticket("T-012", 3 * MIN, "REWORKING"),
    ticket("T-013", 16 * MIN),
    ticket("T-014", 4 * MIN, "QUEUED", { brand: AI, orderCode: "AI-0042" }),
  ];
  const none = { search: "", brand: undefined, stage: undefined };

  test("flagged first, then whoever has waited longest", () => {
    expect(filterTickets(tickets, none, NOW).map((t) => t.number)).toEqual([
      "T-013",
      "T-012",
      "T-011",
      "T-014",
      "T-010",
    ]);
  });

  test("searches the ticket number and the order code", () => {
    expect(filterTickets(tickets, { ...none, search: "ai-0042" }, NOW).map((t) => t.number)).toEqual(["T-014"]);
    expect(filterTickets(tickets, { ...none, search: "t-012" }, NOW).map((t) => t.number)).toEqual(["T-012"]);
  });

  test("narrows by brand and stage", () => {
    expect(filterTickets(tickets, { ...none, brand: "AI" }, NOW)).toHaveLength(1);
    expect(filterTickets(tickets, { ...none, stage: "REWORKING" }, NOW)).toHaveLength(1);
  });

  test("counts the tickets that need attention", () => {
    expect(countFlagged(tickets, NOW)).toBe(2);
  });
});

test("the mock spread covers every kind of flag", () => {
  const tickets = mockTickets(NOW);
  const reasons = new Set(tickets.map((t) => flagReason(t, NOW)));
  expect(reasons).toEqual(new Set(["late", "rework", "recheck", null]));
  expect(new Set(tickets.map((t) => t.number)).size).toBe(tickets.length);
});

describe("ticketTimeline", () => {
  test("lists every step, with the ones not reached yet left open", () => {
    const steps = ticketTimeline(
      ticket("T-5", 6 * MIN, "ACKNOWLEDGED", { acknowledgedAt: new Date(NOW).toISOString() }),
    );
    expect(steps.map((s) => s.label)).toEqual([
      "Order sent",
      "Ticket created",
      "Acknowledged",
      "Started cooking",
      "Ready",
      "Handed over",
    ]);
    expect(steps.map((s) => s.at !== null)).toEqual([true, true, true, false, false, false]);
  });

  test("formatGap rounds to minutes and calls anything shorter right away", () => {
    expect(formatGap(20_000)).toBe("Right away");
    expect(formatGap(4 * MIN + 10_000)).toBe("4 min later");
  });
});

describe("handed over", () => {
  const handed = (sentMsAgo: number, tookMs: number) =>
    ticket("T-9", sentMsAgo, "HANDED_OVER", { handedOverAt: new Date(NOW - sentMsAgo + tookMs).toISOString() });

  test("the clock stops at the handover and it's never flagged", () => {
    const slow = handed(60 * MIN, 22 * MIN);
    expect(formatElapsed(elapsedMs(slow, NOW))).toBe("22:00");
    expect(flagReason(slow, NOW)).toBeNull();
  });

  test("only shows when its stage is asked for, latest handover first", () => {
    const tickets = [ticket("T-1", MIN), handed(50 * MIN, 10 * MIN), handed(40 * MIN, 12 * MIN)];
    const none = { search: "", brand: undefined, stage: undefined };
    expect(filterTickets(tickets, none, NOW).map((t) => t.number)).toEqual(["T-1"]);
    const done = filterTickets(tickets, { ...none, stage: "HANDED_OVER" }, NOW);
    expect(done.map((t) => t.handedOverAt)).toEqual([
      new Date(NOW - 28 * MIN).toISOString(),
      new Date(NOW - 40 * MIN).toISOString(),
    ]);
  });
});

test("only handed-over delivery tickets show handoff photos", () => {
  expect(showsHandoffPhotos(ticket("T-1", MIN, "HANDED_OVER", { channel: "GRABFOOD" }))).toBe(true);
  expect(showsHandoffPhotos(ticket("T-1", MIN, "HANDED_OVER", { channel: "FOODPANDA" }))).toBe(true);
  expect(showsHandoffPhotos(ticket("T-1", MIN, "HANDED_OVER", { channel: "DINE_IN" }))).toBe(false);
  expect(showsHandoffPhotos(ticket("T-1", MIN, "HANDED_OVER", { channel: "TAKEAWAY" }))).toBe(false);
  expect(showsHandoffPhotos(ticket("T-1", MIN, "READY", { channel: "GRABFOOD" }))).toBe(false);
});

describe("QC history", () => {
  const withChecks = (...statuses: QcStatus[]) =>
    ticket("T-1", MIN, "READY", { qcAttempts: statuses.map((status, i) => attempt(i + 1, status)) });

  test("counts failures from the attempts", () => {
    expect(qcFailures(withChecks("FAILED", "FAILED", "PASSED"))).toBe(2);
  });

  test("sums the checks up in one line", () => {
    expect(qcSummary(withChecks())).toBe("Not checked yet");
    expect(qcSummary(withChecks("IN_PROGRESS"))).toBe("Being checked");
    expect(qcSummary(withChecks("PASSED"))).toBe("Passed first time");
    expect(qcSummary(withChecks("FAILED", "PASSED"))).toBe("Passed on check 2 · failed once");
    expect(qcSummary(withChecks("FAILED", "FAILED"))).toBe("2 checks · failed twice");
    expect(qcSummary(withChecks("FAILED", "IN_PROGRESS"))).toBe("Being rechecked · failed once");
  });

  test("mock checks run in order and rejections point at the ticket's own items", () => {
    for (const t of mockTickets(NOW)) {
      t.qcAttempts.forEach((a, i) => {
        expect(a.number).toBe(i + 1);
        if (a.completedAt) expect(Date.parse(a.completedAt)).toBeGreaterThanOrEqual(Date.parse(a.startedAt));
        if (i > 0) expect(Date.parse(a.startedAt)).toBeGreaterThan(Date.parse(t.qcAttempts[i - 1].completedAt!));
        expect(a.rejections.length > 0).toBe(a.status === "FAILED");
        for (const r of a.rejections) {
          const item = t.items.find((it) => it.id === r.itemId);
          expect(item).toBeDefined();
          expect(r.portion).toBeLessThanOrEqual(item!.quantity);
        }
      });
    }
  });
});
