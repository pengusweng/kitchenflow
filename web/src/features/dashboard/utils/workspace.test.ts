import { describe, expect, test } from "vitest";
import type { BrandResponse } from "@/src/features/brands/schemas/brandSchema";
import type { KitchenTicket } from "@/src/features/kitchen-overview/utils/tickets";
import type { MenuBrand } from "@/src/features/menu/utils/menu";
import { todayInManila } from "@/src/features/audit-history/utils/audit";
import {
  formatBusinessDate,
  formatUpdatedTime,
  isKitchenWorkspaceRole,
  isOrderWorkspaceRole,
  isRecipeWorkspaceRole,
  kitchenHref,
  menuHref,
  OPEN_KITCHEN_STAGES,
  ordersHref,
  recipesHref,
  summarizeBrandOperations,
  summarizeKitchenActivity,
  timeGreeting,
  toWorkspaceBrands,
} from "./workspace";

const NOW = Date.parse("2026-11-27T06:30:00.000Z"); // 2:30 PM Manila
const MIN = 60_000;

const GC: MenuBrand = { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#B91C1C" };
const AI: MenuBrand = { id: "b-ai", code: "AI", name: "Aurelia's Inasal", accent: "#B86B43" };

function makeTicket(
  id: string,
  number: string,
  stage: KitchenTicket["stage"],
  minsAgo: number,
  extra: Partial<KitchenTicket> = {},
): KitchenTicket {
  const created = new Date(NOW - minsAgo * MIN).toISOString();
  return {
    id,
    number,
    orderCode: `ORD-${number}`,
    brand: GC,
    channel: "DINE_IN",
    stage,
    orderSentAt: created,
    createdAt: created,
    acknowledgedAt: null,
    preparationStartedAt: null,
    readyAt: null,
    handedOverAt: null,
    qcFailureCount: 0,
    items: [],
    ...extra,
  };
}

describe("timeGreeting & Asia/Manila dates", () => {
  test("greets by Asia/Manila hour", () => {
    expect(timeGreeting("King", Date.parse("2026-11-27T01:00:00.000Z"))).toBe("Good morning, King");
    expect(timeGreeting("King", NOW)).toBe("Good afternoon, King");
    expect(timeGreeting("King", Date.parse("2026-11-27T11:30:00.000Z"))).toBe("Good evening, King");
    expect(timeGreeting("", undefined)).toBe("Welcome");
  });

  test("handles Asia/Manila midnight rollover accurately", () => {
    // 15:59:59Z -> 23:59:59 Manila (Nov 27); 16:00:00Z -> 00:00:00 Manila (Nov 28)
    expect(todayInManila(new Date("2026-11-27T15:59:59.000Z"))).toBe("2026-11-27");
    expect(todayInManila(new Date("2026-11-27T16:00:00.000Z"))).toBe("2026-11-28");
  });

  test("formats Manila business date and updated time", () => {
    expect(formatBusinessDate("2026-11-27", NOW)).toContain("Nov 27, 2026");
    expect(formatUpdatedTime(NOW)).toContain("2:30");
    expect(formatUpdatedTime(NOW, "2026-11-28")).toContain("Nov 27, 2:30");
    expect(formatUpdatedTime(null)).toBeNull();
  });
});

describe("role helpers", () => {
  test("enforce strict web role capabilities", () => {
    expect(isOrderWorkspaceRole("SUPERADMIN")).toBe(true);
    expect(isOrderWorkspaceRole("SUPERVISOR")).toBe(true);
    expect(isOrderWorkspaceRole("KITCHEN_HEAD")).toBe(false);
    expect(isOrderWorkspaceRole("RECIPE_MANAGER")).toBe(false);

    expect(isKitchenWorkspaceRole("KITCHEN_HEAD")).toBe(true);
    expect(isKitchenWorkspaceRole("RECIPE_MANAGER")).toBe(false);

    expect(isRecipeWorkspaceRole("RECIPE_MANAGER")).toBe(true);
    expect(isRecipeWorkspaceRole("SUPERADMIN")).toBe(false);
  });
});

describe("toWorkspaceBrands", () => {
  test("orders pilot brands first, strips invalid logo URLs, and puts inactive last", () => {
    const raw: BrandResponse[] = [
      {
        brand_id: "4",
        code: "zz",
        name: "Zulu Brand",
        logo_url: "uploads/bad-key.png",
        is_active: false,
        created_at: "2026-11-01T00:00:00Z",
        modified_at: "2026-11-01T00:00:00Z",
      },
      {
        brand_id: "3",
        code: "kk",
        name: "King Kungs Kafé",
        logo_url: "https://cdn.example.com/kk.png",
        is_active: true,
        created_at: "2026-11-01T00:00:00Z",
        modified_at: "2026-11-01T00:00:00Z",
      },
      {
        brand_id: "1",
        code: "gc",
        name: "Gamcheon",
        logo_url: null,
        is_active: true,
        created_at: "2026-11-01T00:00:00Z",
        modified_at: "2026-11-01T00:00:00Z",
      },
    ];

    const normalized = toWorkspaceBrands(raw);
    expect(normalized.map((b) => b.code)).toEqual(["GC", "KK", "ZZ"]);
    expect(normalized[1].logoUrl).toBe("https://cdn.example.com/kk.png");
    expect(normalized[2].logoUrl).toBeNull();
  });
});

describe("summarizeKitchenActivity dynamic distribution", () => {
  test("scenario: five statuses with one ticket each produce five equal 20% segments", () => {
    const tickets = [
      makeTicket("1", "001", "QUEUED", 2),
      makeTicket("2", "002", "PREPARING", 4),
      makeTicket("3", "003", "REWORKING", 6),
      makeTicket("4", "004", "FOR_CHECKING", 3),
      makeTicket("5", "005", "READY", 8),
    ];

    const summary = summarizeKitchenActivity(tickets, NOW);
    expect(summary.totalOpen).toBe(5);
    expect(summary.stages.map((s) => s.stage)).toEqual(OPEN_KITCHEN_STAGES);
    expect(summary.stages.filter((s) => s.count > 0).map((s) => [s.stage, s.exactPct])).toEqual([
      ["QUEUED", 20],
      ["PREPARING", 20],
      ["REWORKING", 20],
      ["FOR_CHECKING", 20],
      ["READY", 20],
    ]);
    expect(summary.counts.ACKNOWLEDGED).toBe(0);
    expect(summary.counts.CHECKING).toBe(0);
  });

  test("scenario: Preparing 6, Queued 3, Ready 1 produce 60%, 30%, 10%", () => {
    const tickets = [
      ...Array.from({ length: 6 }, (_, i) => makeTicket(`p-${i}`, `10${i}`, "PREPARING", 3)),
      ...Array.from({ length: 3 }, (_, i) => makeTicket(`q-${i}`, `20${i}`, "QUEUED", 2)),
      makeTicket("r-0", "301", "READY", 4),
    ];

    const summary = summarizeKitchenActivity(tickets, NOW);
    expect(summary.totalOpen).toBe(10);
    expect(summary.stages.filter((s) => s.count > 0).map((s) => [s.stage, s.exactPct])).toEqual([
      ["QUEUED", 30],
      ["PREPARING", 60],
      ["READY", 10],
    ]);
  });

  test("scenario: all tickets in one status produce a single 100% segment", () => {
    const tickets = [
      makeTicket("1", "001", "CHECKING", 4),
      makeTicket("2", "002", "CHECKING", 5),
    ];
    const summary = summarizeKitchenActivity(tickets, NOW);
    expect(summary.totalOpen).toBe(2);
    expect(summary.stages.filter((s) => s.count > 0).map((s) => [s.stage, s.exactPct])).toEqual([["CHECKING", 100]]);
  });

  test("scenario: no active tickets (or only handed-over) yields clean zero counts without NaN", () => {
    const handedOverOnly = [makeTicket("h-1", "901", "HANDED_OVER", 25)];
    for (const set of [[], handedOverOnly]) {
      const summary = summarizeKitchenActivity(set, NOW);
      expect(summary.totalOpen).toBe(0);
      expect(summary.flaggedTickets).toEqual([]);
      for (const row of summary.stages) {
        expect(row.count).toBe(0);
        expect(row.exactPct).toBe(0);
      }
    }
  });

  test("ranks flagged tickets by rework -> recheck -> late and summarizes per-brand counts", () => {
    const tickets: KitchenTicket[] = [
      makeTicket("t1", "001", "QUEUED", 2),
      makeTicket("t2", "002", "PREPARING", 18),
      makeTicket("t3", "003", "REWORKING", 5),
      makeTicket("t4", "004", "FOR_CHECKING", 7, { qcFailureCount: 1, brand: AI }),
      makeTicket("t5", "005", "HANDED_OVER", 30),
    ];

    const summary = summarizeKitchenActivity(tickets, NOW);
    expect(summary.totalOpen).toBe(4);
    expect(summary.flaggedTickets.map((f) => [f.ticket.number, f.reason])).toEqual([
      ["003", "rework"],
      ["004", "recheck"],
      ["002", "late"],
    ]);

    const brands = [
      { id: "b-gc", code: "GC", name: "Gamcheon", accent: "#B91C1C", logoUrl: null, isActive: true },
      { id: "b-ai", code: "AI", name: "Aurelia's Inasal", accent: "#B86B43", logoUrl: null, isActive: true },
    ];
    const ops = summarizeBrandOperations({
      brands,
      tickets,
      menuBrandCounts: { "b-gc": { total: 10, unavailable: 2 } },
    });
    expect(ops[0]).toMatchObject({ activeTickets: 3, unavailableItems: 2 });
    expect(ops[1]).toMatchObject({ activeTickets: 1, unavailableItems: 0 });
  });
});

describe("URL destination builders", () => {
  test("preserve exact filter query parameters", () => {
    expect(ordersHref({ from: "2026-11-27", to: "2026-11-27", payment: "PAID" })).toBe(
      "/dashboard/orders?from=2026-11-27&to=2026-11-27&payment=PAID",
    );
    expect(kitchenHref({ brandCode: "GC", stage: "REWORKING" })).toBe(
      "/dashboard/kitchen-overview?brand=GC&stage=REWORKING",
    );
    expect(kitchenHref({ ticketId: "t-99" })).toBe("/dashboard/kitchen-overview?ticket=t-99");
    expect(menuHref({ brandCode: "AI", availability: "unavailable" })).toBe(
      "/dashboard/menu?brand=AI&availability=unavailable",
    );
    expect(recipesHref({ brandCode: "KK", status: "inactive" })).toBe(
      "/dashboard/recipes?brand=KK&status=inactive",
    );
  });
});
