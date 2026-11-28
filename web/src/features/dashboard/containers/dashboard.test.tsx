// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { server } from "@/tests/mocks/server";
import { todayInManila } from "@/src/features/audit-history/utils/audit";
import { useTodayInManila } from "@/src/features/orders/hooks/useTodayInManila";
import WorkspacePage from "./dashboard";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string | { src: string }; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : src.src} alt={alt} className={className} />
  ),
}));

type MockEventSourceInstance = {
  url: string;
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: (() => void) | null;
  close: () => void;
};

let eventSources: MockEventSourceInstance[] = [];

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  url: string;
  readyState = MockEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    eventSources.push(this);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }
}

const GC_ID = "11111111-1111-4111-8111-111111111101";
const AI_ID = "11111111-1111-4111-8111-111111111102";
const KK_ID = "11111111-1111-4111-8111-111111111103";

const BRANDS_PAYLOAD = {
  data: [
    {
      brand_id: GC_ID,
      code: "GC",
      name: "Gamcheon",
      logo_url: null,
      is_active: true,
      created_at: "2026-10-01T00:00:00.000Z",
      modified_at: "2026-10-01T00:00:00.000Z",
    },
    {
      brand_id: AI_ID,
      code: "AI",
      name: "Aurelia's Inasal",
      logo_url: null,
      is_active: true,
      created_at: "2026-10-01T00:00:00.000Z",
      modified_at: "2026-10-01T00:00:00.000Z",
    },
    {
      brand_id: KK_ID,
      code: "KK",
      name: "King Kungs Kafé",
      logo_url: null,
      is_active: true,
      created_at: "2026-10-01T00:00:00.000Z",
      modified_at: "2026-10-01T00:00:00.000Z",
    },
  ],
  meta: {
    page: 1,
    limit: 100,
    total: 3,
    totalPages: 1,
    counts: { all: 3, active: 3, inactive: 0 },
  },
};

function makeTicketRecord(
  id: string,
  ticketNumber: string,
  brandId: string,
  status: string,
  minsAgo: number,
  failures = 0,
) {
  const at = new Date(Date.now() - minsAgo * 60_000).toISOString();
  return {
    kitchen_ticket_id: id,
    order_code: `ORD-${ticketNumber}`,
    ticket_number: ticketNumber,
    status,
    brand_id: brandId,
    order_channel: "DINE_IN",
    order_confirmed_at: at,
    qc_failure_count: failures,
    acknowledged_at: null,
    preparation_started_at: null,
    ready_at: null,
    handed_over_at: null,
    created_at: at,
    order_items: [
      {
        order_item_id: `item-${id}`,
        item_name: "Samgyup Bento",
        quantity: 1,
        notes: null,
        modifiers: [],
      },
    ],
  };
}

function makeOrdersPage(total: number) {
  return {
    data: [],
    meta: {
      page: 1,
      limit: 1,
      total,
      totalPages: total,
      counts: { all: total, DRAFT: 0, CONFIRMED: 0, PREPARING: total, COMPLETED: 0, CANCELLED: 0 },
    },
  };
}

const MENU_PAYLOAD = {
  data: [],
  meta: {
    page: 1,
    limit: 1,
    total: 12,
    totalPages: 12,
    counts: {
      status: { all: 12, active: 12, inactive: 0 },
      availability: { all: 12, available: 9, unavailable: 3 },
      brands: {
        [GC_ID]: { total: 4, unavailable: 2 },
        [AI_ID]: { total: 4, unavailable: 1 },
        [KK_ID]: { total: 4, unavailable: 0 },
      },
    },
  },
};

function renderWorkspace(role: string, firstName = "King") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WorkspacePage firstName={firstName} role={role} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  eventSources = [];
  vi.stubGlobal("EventSource", MockEventSource);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-27T06:30:00Z"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("WorkspacePage", () => {
  test("SUPERADMIN renders greeting, static current business date, centered brands, live SSE proportions, and attention list", async () => {
    const initialTickets = [
      makeTicketRecord("tk-1", "104", GC_ID, "REWORKING", 6, 1),
      makeTicketRecord("tk-2", "105", AI_ID, "PREPARING", 19, 0),
      makeTicketRecord("tk-3", "106", GC_ID, "QUEUED", 2, 0),
      makeTicketRecord("tk-4", "107", KK_ID, "PREPARING", 4, 0),
      makeTicketRecord("tk-5", "108", AI_ID, "READY", 8, 0),
    ];

    server.use(
      http.get("*/api/brands", () => HttpResponse.json(BRANDS_PAYLOAD)),
      http.get("*/api/orders", ({ request }) => {
        const payment = new URL(request.url).searchParams.get("payment_status");
        if (payment === "PAID") return HttpResponse.json(makeOrdersPage(21));
        if (payment === "UNPAID") return HttpResponse.json(makeOrdersPage(4));
        return HttpResponse.json(makeOrdersPage(25));
      }),
      http.get("*/api/kitchen-ticket/date/:day", () => HttpResponse.json(initialTickets)),
      http.get("*/api/menu-catalog", () => HttpResponse.json(MENU_PAYLOAD)),
    );

    renderWorkspace("SUPERADMIN", "King");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/King/);
    expect(screen.getByText(/Superadmin workspace/i)).toBeInTheDocument();
    // Historical date navigation is completely removed
    expect(screen.queryByLabelText("Business date")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Previous business day/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();

    expect(await screen.findByText("25")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    const paidLink = screen.getByRole("link", { name: /^Paid orders/i });
    expect(paidLink.getAttribute("href")).toContain("/dashboard/orders?");
    expect(paidLink.getAttribute("href")).toContain("payment=PAID");

    const brandsSection = screen.getByRole("heading", { name: "Your brands" }).closest("section")!;
    expect(within(brandsSection).getByRole("img", { name: "Gamcheon" })).toBeInTheDocument();
    expect(within(brandsSection).getByRole("img", { name: "Aurelia's Inasal" })).toBeInTheDocument();
    expect(within(brandsSection).getByRole("img", { name: "King Kungs Kafé" })).toBeInTheDocument();
    expect(within(brandsSection).queryByText("GC")).not.toBeInTheDocument();
    expect(within(brandsSection).queryByText("AI")).not.toBeInTheDocument();
    expect(within(brandsSection).queryByText("KK")).not.toBeInTheDocument();
    expect(within(brandsSection).getByRole("heading", { name: "Gamcheon", level: 3 })).toBeInTheDocument();
    expect(within(brandsSection).getByRole("link", { name: /Unavailable items for Gamcheon/i })).toBeInTheDocument();

    // Verify dynamic segment bar widths: Preparing (2/5 = 40%), Queued/Rework/Ready (1/5 = 20% each)
    expect(screen.getByText("Connecting")).toBeInTheDocument();
    expect(screen.getByText("5 open")).toBeInTheDocument();
    const kitchenSection = screen.getByRole("heading", { name: "Kitchen activity" }).closest("section")!;
    expect(within(kitchenSection).getByRole("img")).toHaveAccessibleName(/Preparing 2 \(40%\)/);
    expect(kitchenSection.querySelector('[data-stage="PREPARING"]')).toHaveStyle({ flexGrow: 2 });
    expect(kitchenSection.querySelector('[data-stage="QUEUED"]')).toHaveStyle({ flexGrow: 1 });
    expect(kitchenSection.querySelector('[data-stage="ACKNOWLEDGED"]')).toBeNull();

    // Live SSE opens and streams a status update changing Preparing -> Ready
    act(() => {
      eventSources[0].readyState = MockEventSource.OPEN;
      eventSources[0].onopen?.();
    });
    expect(screen.queryByText("Live")).not.toBeInTheDocument();

    const updatedTickets = [
      makeTicketRecord("tk-1", "104", GC_ID, "REWORKING", 6, 1),
      makeTicketRecord("tk-2", "105", AI_ID, "READY", 19, 0),
      makeTicketRecord("tk-3", "106", GC_ID, "QUEUED", 2, 0),
      makeTicketRecord("tk-4", "107", KK_ID, "READY", 4, 0),
      makeTicketRecord("tk-5", "108", AI_ID, "READY", 8, 0),
      makeTicketRecord("tk-6", "109", AI_ID, "CANCELLED", 2),
      makeTicketRecord("tk-7", "110", AI_ID, "HANDED_OVER", 2),
    ];
    act(() => {
      eventSources[0].onmessage?.({ data: JSON.stringify(updatedTickets) } as MessageEvent<string>);
    });

    await waitFor(() => {
      expect(within(kitchenSection).getByRole("img")).toHaveAccessibleName(/Ready 3 \(60%\)/);
    });
    expect(kitchenSection.querySelector('[data-stage="PREPARING"]')).toBeNull();

    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(screen.queryByText("Connecting")).not.toBeInTheDocument();
    expect(screen.getByText("5 open")).toBeInTheDocument();
    act(() => {
      eventSources[0].readyState = MockEventSource.CONNECTING;
      eventSources[0].onerror?.();
    });
    expect(screen.getByText("Reconnecting")).toBeInTheDocument();

    expect(screen.getByText("#104")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inspect ticket 104" })).toHaveAttribute(
      "href",
      `/dashboard/kitchen-overview?day=${todayInManila()}&ticket=tk-1`,
    );
  });

  test("Needs attention header count shows total flagged tickets even when truncated past 6 rows", async () => {
    const manyFlagged = Array.from({ length: 8 }, (_, idx) =>
      makeTicketRecord(`f-${idx}`, `20${idx}`, GC_ID, "REWORKING", 4 + idx, 1),
    );
    server.use(
      http.get("*/api/brands", () => HttpResponse.json(BRANDS_PAYLOAD)),
      http.get("*/api/orders", () => HttpResponse.json(makeOrdersPage(8))),
      http.get("*/api/kitchen-ticket/date/:day", () => HttpResponse.json(manyFlagged)),
      http.get("*/api/menu-catalog", () => HttpResponse.json(MENU_PAYLOAD)),
    );

    renderWorkspace("SUPERVISOR", "QA");

    const attention = within(screen.getByRole("region", { name: "Needs attention" }));
    expect(await attention.findByText("8")).toBeInTheDocument();
    expect(attention.getAllByRole("link", { name: /^Inspect ticket/ })).toHaveLength(6);
    expect(attention.getByRole("link", { name: "View 2 more flagged tickets" })).toBeInTheDocument();
  });

  test("KITCHEN_HEAD omits orders/payment metrics and starts with kitchen summary", async () => {
    const ordersSpy = vi.fn();
    server.use(
      http.get("*/api/brands", () => HttpResponse.json(BRANDS_PAYLOAD)),
      http.get("*/api/orders", () => {
        ordersSpy();
        return HttpResponse.json({}, { status: 403 });
      }),
      http.get("*/api/kitchen-ticket/date/:day", () =>
        HttpResponse.json([makeTicketRecord("tk-9", "109", KK_ID, "FOR_CHECKING", 4, 1)]),
      ),
      http.get("*/api/menu-catalog", () => HttpResponse.json(MENU_PAYLOAD)),
    );

    renderWorkspace("KITCHEN_HEAD", "Carlo");

    expect(await screen.findByText("1 open")).toBeInTheDocument();
    const summaryRegion = screen.getByRole("region", { name: "Kitchen summary" });
    expect(within(summaryRegion).getByRole("link", { name: /^Active tickets/i })).toBeInTheDocument();
    expect(screen.queryByText("Orders today")).not.toBeInTheDocument();
    expect(screen.queryByText("Paid orders")).not.toBeInTheDocument();
    expect(ordersSpy).not.toHaveBeenCalled();
  });

  test("RECIPE_MANAGER sees recipe counts, recent recipes, and brand recipe cards without orders or kitchen", async () => {
    const kitchenSpy = vi.fn();
    const ordersSpy = vi.fn();
    server.use(
      http.get("*/api/brands", () => HttpResponse.json(BRANDS_PAYLOAD)),
      http.get("*/api/kitchen-ticket/date/:day", () => {
        kitchenSpy();
        return HttpResponse.json([]);
      }),
      http.get("*/api/orders", () => {
        ordersSpy();
        return HttpResponse.json(makeOrdersPage(0));
      }),
      http.get("*/api/recipes", ({ request }) => {
        const brandId = new URL(request.url).searchParams.get("brand_id");
        if (brandId) {
          return HttpResponse.json({
            data: [],
            meta: { page: 1, limit: 1, total: 2, totalPages: 2, counts: { all: 2, active: 1, inactive: 1 } },
          });
        }
        return HttpResponse.json({
          data: [
            {
              recipe_id: "22222222-2222-4222-8222-222222222201",
              code: "RCP-GC-001",
              name: "Soy Garlic Glaze",
              brand_id: GC_ID,
              version: 3,
              is_active: true,
              created_at: "2026-10-01T00:00:00.000Z",
              modified_at: "2026-11-26T10:00:00.000Z",
            },
          ],
          meta: { page: 1, limit: 5, total: 14, totalPages: 3, counts: { all: 14, active: 11, inactive: 3 } },
        });
      }),
    );

    renderWorkspace("RECIPE_MANAGER", "Mina");

    expect(await screen.findByText("Soy Garlic Glaze")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Total recipes/i })).toHaveAttribute("href", "/dashboard/recipes?status=all");
    expect(screen.getByRole("link", { name: "View recipe Soy Garlic Glaze" })).toHaveAttribute(
      "href",
      "/dashboard/recipes/22222222-2222-4222-8222-222222222201",
    );
    expect(screen.queryByRole("heading", { name: "Kitchen activity" })).not.toBeInTheDocument();
    expect(screen.queryByText("Orders today")).not.toBeInTheDocument();
    expect(kitchenSpy).not.toHaveBeenCalled();
    expect(ordersSpy).not.toHaveBeenCalled();
  });

  test("shows unavailable state (—) rather than fake zero when an endpoint fails", async () => {
    server.use(
      http.get("*/api/brands", () => HttpResponse.json(BRANDS_PAYLOAD)),
      http.get("*/api/orders", () => HttpResponse.json({ message: "Server down" }, { status: 500 })),
      http.get("*/api/kitchen-ticket/date/:day", () => HttpResponse.json([])),
      http.get("*/api/menu-catalog", () => HttpResponse.json(MENU_PAYLOAD)),
    );

    renderWorkspace("SUPERADMIN", "King");

    await waitFor(() => {
      expect(screen.getAllByText("Couldn't load")).toHaveLength(3);
    });
    expect(screen.getAllByLabelText("Unavailable")).toHaveLength(3);
    expect(screen.getByText("0 open")).toBeInTheDocument();
    expect(screen.getByText("No active kitchen tickets.")).toBeInTheDocument();
  });

  test("rolls orders, kitchen and links over to the new Manila day", async () => {
    vi.setSystemTime(new Date("2026-11-27T15:59:55Z"));
    const visitedDays: string[] = [];
    const orderDates: string[] = [];
    const oldTickets = [makeTicketRecord("old-ticket", "701", GC_ID, "QUEUED", 2)];
    server.use(
      http.get("*/api/brands", () => HttpResponse.json(BRANDS_PAYLOAD)),
      http.get("*/api/orders", ({ request }) => {
        const date = new URL(request.url).searchParams.get("from") ?? "";
        orderDates.push(date);
        return HttpResponse.json(makeOrdersPage(2));
      }),
      http.get("*/api/kitchen-ticket/date/:day", ({ params }) => {
        visitedDays.push(String(params.day));
        return HttpResponse.json(params.day === "2026-11-27" ? oldTickets : []);
      }),
      http.get("*/api/menu-catalog", () => HttpResponse.json(MENU_PAYLOAD)),
    );

    renderWorkspace("SUPERVISOR");
    expect(await screen.findByText("1 open")).toBeInTheDocument();
    const oldStream = eventSources[0];
    expect(screen.getByLabelText(/^Manila business date/)).toHaveAttribute("datetime", "2026-11-27");

    act(() => {
      vi.setSystemTime(new Date("2026-11-27T16:00:02Z"));
      window.dispatchEvent(new Event("pageshow"));
    });

    expect(await screen.findByText("No active kitchen tickets.")).toBeInTheDocument();
    expect(oldStream.readyState).toBe(MockEventSource.CLOSED);
    expect(eventSources).toHaveLength(2);
    expect(visitedDays).toEqual(["2026-11-27", "2026-11-28"]);
    expect(orderDates).toContain("2026-11-28");
    expect(screen.getByLabelText(/^Manila business date/)).toHaveAttribute("datetime", "2026-11-28");
    expect(screen.getByRole("link", { name: "View board" })).toHaveAttribute(
      "href",
      "/dashboard/kitchen-overview?day=2026-11-28",
    );

    act(() => {
      const event = new MessageEvent<string>("message", { data: JSON.stringify(oldTickets) });
      oldStream.onmessage?.(event);
      eventSources[1].onmessage?.(event);
    });
    expect(screen.getByText("0 open")).toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
  });

  test("advances the business date at Manila midnight without page interaction", () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-11-27T15:59:59.000Z"));

    const { result, unmount } = renderHook(useTodayInManila);
    expect(result.current).toBe("2026-11-27");
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe("2026-11-28");
    unmount();
  });

  test("retains the latest successful kitchen timestamp and cached counts on refresh failure", async () => {
    let fail = false;
    let kitchenRequests = 0;
    const tickets = [makeTicketRecord("fresh-ticket", "703", AI_ID, "PREPARING", 2)];
    server.use(
      http.get("*/api/brands", () => HttpResponse.json({}, { status: 500 })),
      http.get("*/api/menu-catalog", () => HttpResponse.json({}, { status: 500 })),
      http.get("*/api/kitchen-ticket/date/:day", () => {
        kitchenRequests += 1;
        return fail ? HttpResponse.json({}, { status: 500 }) : HttpResponse.json(tickets);
      }),
    );
    const { container } = renderWorkspace("KITCHEN_HEAD");
    expect(await screen.findByText("1 open")).toBeInTheDocument();
    const refresh = screen.getByRole("button", { name: "Refresh workspace data" });
    const updated = () => container.querySelector("header time:not([aria-label])");
    await waitFor(() => expect(refresh).toHaveAttribute("aria-disabled", "false"));
    expect(updated()).toHaveAttribute("datetime", "2026-11-27T06:30:00.000Z");

    act(() => {
      vi.setSystemTime(new Date("2026-11-27T06:31:00Z"));
      refresh.click();
    });
    await waitFor(() => expect(updated()).toHaveAttribute("datetime", "2026-11-27T06:31:00.000Z"));

    fail = true;
    act(() => {
      vi.setSystemTime(new Date("2026-11-27T06:32:00Z"));
      refresh.click();
    });
    expect(await screen.findByText("Showing the last kitchen update.")).toBeInTheDocument();
    expect(screen.getByText("1 open")).toBeInTheDocument();
    expect(updated()).toHaveAttribute("datetime", "2026-11-27T06:31:00.000Z");
    expect(kitchenRequests).toBe(3);
  });
});
