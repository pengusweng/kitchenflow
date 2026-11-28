import { createServer } from "node:http";

const PASSWORD = "qa-password";

const USERS = {
  "qa-supervisor": {
    token: "playwright-fixture-token",
    user: {
      user_id: "b6acd2dc-24bd-4b91-8d13-b2f2db76ed16",
      username: "qa-supervisor",
      first_name: "QA",
      last_name: "Supervisor",
      role: "SUPERVISOR",
      is_active: true,
      created_at: "2025-01-01T00:00:00.000Z",
      modified_at: "2025-01-01T00:00:00.000Z",
    },
  },
  "qa-superadmin": {
    token: "playwright-fixture-token-superadmin",
    user: {
      user_id: "a1111111-1111-4111-8111-111111111101",
      username: "qa-superadmin",
      first_name: "King",
      last_name: "Owner",
      role: "SUPERADMIN",
      is_active: true,
      created_at: "2025-01-01T00:00:00.000Z",
      modified_at: "2025-01-01T00:00:00.000Z",
    },
  },
  "qa-kitchen": {
    token: "playwright-fixture-token-kitchen",
    user: {
      user_id: "a1111111-1111-4111-8111-111111111102",
      username: "qa-kitchen",
      first_name: "Carlo",
      last_name: "Reyes",
      role: "KITCHEN_HEAD",
      is_active: true,
      created_at: "2025-01-01T00:00:00.000Z",
      modified_at: "2025-01-01T00:00:00.000Z",
    },
  },
  // A superadmin with no PIN yet: login asks for PIN setup, and setup signs in.
  // Stateless, so every run (and every retry) starts from the setup step.
  "qa-newadmin": {
    token: "playwright-fixture-token-newadmin",
    needsPinSetup: true,
    user: {
      user_id: "a1111111-1111-4111-8111-111111111104",
      username: "qa-newadmin",
      first_name: "Nina",
      last_name: "Cruz",
      role: "SUPERADMIN",
      is_active: true,
      created_at: "2025-01-01T00:00:00.000Z",
      modified_at: "2025-01-01T00:00:00.000Z",
    },
  },
  "qa-recipes": {
    token: "playwright-fixture-token-recipes",
    user: {
      user_id: "a1111111-1111-4111-8111-111111111103",
      username: "qa-recipes",
      first_name: "Mina",
      last_name: "Santos",
      role: "RECIPE_MANAGER",
      is_active: true,
      created_at: "2025-01-01T00:00:00.000Z",
      modified_at: "2025-01-01T00:00:00.000Z",
    },
  },
};

const USERS_BY_TOKEN = Object.fromEntries(Object.values(USERS).map((entry) => [entry.token, entry.user]));

const GC_ID = "11111111-1111-4111-8111-111111111101";
const AI_ID = "11111111-1111-4111-8111-111111111102";
const KK_ID = "11111111-1111-4111-8111-111111111103";

const BRANDS = [
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
];

const BRAND_SUMMARY = Object.fromEntries(
  BRANDS.map((b) => [b.brand_id, { brand_id: b.brand_id, code: b.code, name: b.name }]),
);

const agoIso = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

function todayManilaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

function makeOrders() {
  const day = todayManilaDate();
  const orderDate = `${day}T00:00:00.000Z`;
  return [
    {
      order_id: "33333333-3333-4333-8333-333333333301",
      order_code: "GC-00104",
      order_date: orderDate,
      brand_id: GC_ID,
      order_channel: "DINE_IN",
      status: "PREPARING",
      payment_status: "PAID",
      payment_method: "E_WALLET",
      payment_reference: "GC-REF-8841",
      table_reference: "T-04",
      external_order_reference: null,
      notes: null,
      cancellation_reason: null,
      confirmed_at: agoIso(22),
      completed_at: null,
      cancelled_at: null,
      created_at: agoIso(22),
      brand: BRAND_SUMMARY[GC_ID],
    },
    {
      order_id: "33333333-3333-4333-8333-333333333302",
      order_code: "AI-00105",
      order_date: orderDate,
      brand_id: AI_ID,
      order_channel: "TAKEAWAY",
      status: "PREPARING",
      payment_status: "PAID",
      payment_method: "CASH",
      payment_reference: null,
      table_reference: null,
      external_order_reference: null,
      notes: null,
      cancellation_reason: null,
      confirmed_at: agoIso(19),
      completed_at: null,
      cancelled_at: null,
      created_at: agoIso(19),
      brand: BRAND_SUMMARY[AI_ID],
    },
    {
      order_id: "33333333-3333-4333-8333-333333333303",
      order_code: "KK-00106",
      order_date: orderDate,
      brand_id: KK_ID,
      order_channel: "GRABFOOD",
      status: "CONFIRMED",
      payment_status: "UNPAID",
      payment_method: null,
      payment_reference: null,
      table_reference: null,
      external_order_reference: "GF-9041",
      notes: "Extra ice on the side",
      cancellation_reason: null,
      confirmed_at: agoIso(6),
      completed_at: null,
      cancelled_at: null,
      created_at: agoIso(6),
      brand: BRAND_SUMMARY[KK_ID],
    },
    {
      order_id: "33333333-3333-4333-8333-333333333304",
      order_code: "GC-00107",
      order_date: orderDate,
      brand_id: GC_ID,
      order_channel: "DINE_IN",
      status: "COMPLETED",
      payment_status: "PAID",
      payment_method: "CASH",
      payment_reference: null,
      table_reference: "T-09",
      external_order_reference: null,
      notes: null,
      cancellation_reason: null,
      confirmed_at: agoIso(40),
      completed_at: agoIso(25),
      cancelled_at: null,
      created_at: agoIso(40),
      brand: BRAND_SUMMARY[GC_ID],
    },
  ];
}

function makeTickets() {
  const businessDayStart = Date.parse(`${todayManilaDate()}T00:00:00+08:00`);
  const createdToday = (minutes) => new Date(Math.max(businessDayStart, Date.parse(agoIso(minutes)))).toISOString();
  return [
    {
      kitchen_ticket_id: "44444444-4444-4444-8444-444444444401",
      order_code: "GC-00104",
      ticket_number: "104",
      status: "REWORKING",
      brand_id: GC_ID,
      order_channel: "DINE_IN",
      order_confirmed_at: agoIso(12),
      qc_failure_count: 1,
      acknowledged_at: agoIso(11),
      preparation_started_at: agoIso(10),
      ready_at: null,
      handed_over_at: null,
      created_at: createdToday(12),
      order_items: [
        {
          order_item_id: "44444444-4444-4444-8444-555555555501",
          item_name: "Samgyupsal Solo Box",
          quantity: 1,
          notes: "Well done",
          modifiers: [{ modifier_name: "Kimchi Side" }],
        },
      ],
    },
    {
      kitchen_ticket_id: "44444444-4444-4444-8444-444444444402",
      order_code: "AI-00105",
      ticket_number: "105",
      status: "PREPARING",
      brand_id: AI_ID,
      order_channel: "TAKEAWAY",
      order_confirmed_at: agoIso(18),
      qc_failure_count: 0,
      acknowledged_at: agoIso(17),
      preparation_started_at: agoIso(16),
      ready_at: null,
      handed_over_at: null,
      created_at: createdToday(18),
      order_items: [
        {
          order_item_id: "44444444-4444-4444-8444-555555555502",
          item_name: "Paa Inasal Value Meal",
          quantity: 2,
          notes: null,
          modifiers: [{ modifier_name: "Chicken Oil" }],
        },
      ],
    },
    {
      kitchen_ticket_id: "44444444-4444-4444-8444-444444444403",
      order_code: "KK-00106",
      ticket_number: "106",
      status: "FOR_CHECKING",
      brand_id: KK_ID,
      order_channel: "GRABFOOD",
      order_confirmed_at: agoIso(7),
      qc_failure_count: 1,
      acknowledged_at: agoIso(6),
      preparation_started_at: agoIso(5),
      ready_at: null,
      handed_over_at: null,
      created_at: createdToday(7),
      order_items: [
        {
          order_item_id: "44444444-4444-4444-8444-555555555503",
          item_name: "Iced Spanish Latte",
          quantity: 1,
          notes: "Less sweet",
          modifiers: [],
        },
      ],
    },
    {
      kitchen_ticket_id: "44444444-4444-4444-8444-444444444404",
      order_code: "GC-00108",
      ticket_number: "108",
      status: "QUEUED",
      brand_id: GC_ID,
      order_channel: "DINE_IN",
      order_confirmed_at: agoIso(3),
      qc_failure_count: 0,
      acknowledged_at: null,
      preparation_started_at: null,
      ready_at: null,
      handed_over_at: null,
      created_at: createdToday(3),
      order_items: [
        {
          order_item_id: "44444444-4444-4444-8444-555555555504",
          item_name: "Japchae Tray",
          quantity: 1,
          notes: null,
          modifiers: [],
        },
      ],
    },
    {
      kitchen_ticket_id: "44444444-4444-4444-8444-444444444405",
      order_code: "AI-00109",
      ticket_number: "109",
      status: "READY",
      brand_id: AI_ID,
      order_channel: "DINE_IN",
      order_confirmed_at: agoIso(9),
      qc_failure_count: 0,
      acknowledged_at: agoIso(8),
      preparation_started_at: agoIso(7),
      ready_at: agoIso(1),
      handed_over_at: null,
      created_at: createdToday(9),
      order_items: [
        {
          order_item_id: "44444444-4444-4444-8444-555555555505",
          item_name: "Pecho Platter",
          quantity: 1,
          notes: null,
          modifiers: [],
        },
      ],
    },
  ];
}

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='64'%20height='64'%3E%3Crect%20width='64'%20height='64'%20fill='%23b86b43'/%3E%3C/svg%3E";

const MENU_ITEMS = [
  {
    menu_item_id: "55555555-5555-4555-8555-555555555501",
    brand_id: GC_ID,
    code: "GC-M01",
    name: "Spicy Bulgogi Rice Bowl",
    description: "Seared beef strips in gochujang glaze",
    serving_description: "1 bowl",
    img_url: PLACEHOLDER_IMG,
    base_price: 245,
    is_available: false,
    is_active: true,
    recipe: { recipe_id: "66666666-6666-4666-8666-666666666601", name: "Spicy Bulgogi Sauce", is_active: true },
    menuChannels: [],
    menuItemModifiers: [],
  },
  {
    menu_item_id: "55555555-5555-4555-8555-555555555502",
    brand_id: GC_ID,
    code: "GC-M02",
    name: "Gochujang Pork Belly",
    description: "Chargrilled pork belly marinated overnight",
    serving_description: "180g",
    img_url: PLACEHOLDER_IMG,
    base_price: 280,
    is_available: false,
    is_active: true,
    recipe: { recipe_id: "66666666-6666-4666-8666-666666666602", name: "Pork Belly Marinade", is_active: true },
    menuChannels: [],
    menuItemModifiers: [],
  },
  {
    menu_item_id: "55555555-5555-4555-8555-555555555503",
    brand_id: AI_ID,
    code: "AI-M01",
    name: "Paa Inasal Value Meal",
    description: "Achiote-basted chicken leg quarter",
    serving_description: "With Java rice",
    img_url: PLACEHOLDER_IMG,
    base_price: 175,
    is_available: true,
    is_active: true,
    recipe: { recipe_id: "66666666-6666-4666-8666-666666666603", name: "Inasal Basting Oil", is_active: true },
    menuChannels: [],
    menuItemModifiers: [],
  },
  {
    menu_item_id: "55555555-5555-4555-8555-555555555504",
    brand_id: AI_ID,
    code: "AI-M02",
    name: "Atchara Jar (350g)",
    description: "Pickled green papaya",
    serving_description: "350g jar",
    img_url: PLACEHOLDER_IMG,
    base_price: 120,
    is_available: false,
    is_active: true,
    recipe: { recipe_id: "66666666-6666-4666-8666-666666666604", name: "Atchara Brine", is_active: true },
    menuChannels: [],
    menuItemModifiers: [],
  },
  {
    menu_item_id: "55555555-5555-4555-8555-555555555505",
    brand_id: KK_ID,
    code: "KK-M01",
    name: "Iced Spanish Latte",
    description: "Double espresso over condensed milk",
    serving_description: "16 oz",
    img_url: PLACEHOLDER_IMG,
    base_price: 145,
    is_available: true,
    is_active: true,
    recipe: { recipe_id: "66666666-6666-4666-8666-666666666605", name: "Spanish Latte Base", is_active: true },
    menuChannels: [],
    menuItemModifiers: [],
  },
];

const RECIPES = [
  {
    recipe_id: "66666666-6666-4666-8666-666666666601",
    code: "RCP-GC-001",
    name: "Spicy Bulgogi Sauce",
    brand_id: GC_ID,
    version: 3,
    is_active: true,
    created_at: "2026-10-02T00:00:00.000Z",
    modified_at: "2026-11-26T09:15:00.000Z",
  },
  {
    recipe_id: "66666666-6666-4666-8666-666666666602",
    code: "RCP-GC-002",
    name: "Pork Belly Marinade",
    brand_id: GC_ID,
    version: 1,
    is_active: false,
    created_at: "2026-09-15T00:00:00.000Z",
    modified_at: "2026-11-24T11:30:00.000Z",
  },
  {
    recipe_id: "66666666-6666-4666-8666-666666666603",
    code: "RCP-AI-001",
    name: "Inasal Basting Oil",
    brand_id: AI_ID,
    version: 5,
    is_active: true,
    created_at: "2026-10-05T00:00:00.000Z",
    modified_at: "2026-11-25T16:45:00.000Z",
  },
  {
    recipe_id: "66666666-6666-4666-8666-666666666605",
    code: "RCP-KK-001",
    name: "Spanish Latte Base",
    brand_id: KK_ID,
    version: 2,
    is_active: true,
    created_at: "2026-10-12T00:00:00.000Z",
    modified_at: "2026-11-25T08:00:00.000Z",
  },
];

function userFromRequest(request) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return USERS_BY_TOKEN[header.slice("Bearer ".length)] ?? null;
}

createServer(async (request, response) => {
  function json(status, body) {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  }

  const parsedUrl = new URL(request.url ?? "/", "http://127.0.0.1:3101");
  const { pathname, searchParams } = parsedUrl;

  if (request.method === "GET" && pathname === "/health") {
    return json(200, { ready: true });
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const credentials = JSON.parse(body || "{}");
    const entry = USERS[credentials.username];
    if (!entry || credentials.password !== PASSWORD) {
      return json(401, { message: "Invalid credentials" });
    }
    if (entry.needsPinSetup) {
      return json(403, { code: "PIN_SETUP_REQUIRED", message: "Set up your 4-digit PIN to finish signing in." });
    }
    return json(200, {
      token: entry.token,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      user: entry.user,
    });
  }

  if (request.method === "POST" && pathname === "/api/auth/pin-setup") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body || "{}");
    const entry = USERS[input.username];
    if (!entry || input.password !== PASSWORD) {
      return json(401, { code: "INVALID_CREDENTIALS", message: "Invalid username or password." });
    }
    if (typeof input.pin !== "string" || !/^[0-9]{4}$/.test(input.pin)) {
      return json(400, { message: ["PIN must contain exactly four digits."] });
    }
    if (entry.user.role !== "SUPERADMIN") {
      return json(403, { code: "PIN_SETUP_NOT_ALLOWED", message: "Only superadmins set up their PIN while signing in." });
    }
    if (!entry.needsPinSetup) {
      return json(409, { code: "EXISTING_PIN_FOUND", message: "User already has existing pin" });
    }
    return json(200, {
      token: entry.token,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      user: entry.user,
    });
  }

  if (request.method === "GET" && pathname === "/api/auth/me") {
    const user = userFromRequest(request);
    return user ? json(200, user) : json(401, { message: "Invalid session" });
  }

  if (request.method === "POST" && pathname === "/api/auth/logout") {
    response.writeHead(204);
    return response.end();
  }

  const user = userFromRequest(request);
  if (!user) {
    return json(401, { message: "Invalid session" });
  }

  if (request.method === "GET" && pathname === "/api/brands") {
    const status = searchParams.get("status");
    const activeOnly = searchParams.get("activeOnly");
    const list =
      status === "active" || activeOnly === "true"
        ? BRANDS.filter((b) => b.is_active)
        : status === "inactive"
          ? BRANDS.filter((b) => !b.is_active)
          : BRANDS;
    return json(200, {
      data: list,
      meta: {
        page: 1,
        limit: 100,
        total: list.length,
        totalPages: 1,
        counts: { all: BRANDS.length, active: BRANDS.length, inactive: 0 },
      },
    });
  }

  if (request.method === "GET" && pathname === "/api/orders") {
    if (!["SUPERADMIN", "SUPERVISOR", "CASHIER_STAFF"].includes(user.role)) {
      return json(403, { message: "Forbidden" });
    }
    const orders = makeOrders();
    const payment = searchParams.get("payment_status");
    const status = searchParams.get("status");
    const brandId = searchParams.get("brand_id");
    let filtered = orders;
    if (payment) filtered = filtered.filter((o) => o.payment_status === payment);
    if (status) filtered = filtered.filter((o) => o.status === status);
    if (brandId) filtered = filtered.filter((o) => o.brand_id === brandId);
    return json(200, {
      data: filtered,
      meta: {
        page: 1,
        limit: Number(searchParams.get("limit") ?? 20),
        total: filtered.length,
        totalPages: 1,
        counts: {
          all: orders.length,
          DRAFT: 0,
          CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
          PREPARING: orders.filter((o) => o.status === "PREPARING").length,
          COMPLETED: orders.filter((o) => o.status === "COMPLETED").length,
          CANCELLED: 0,
        },
      },
    });
  }

  if (request.method === "GET" && pathname === "/api/kitchen-ticket/today/stream") {
    if (!["SUPERADMIN", "SUPERVISOR", "KITCHEN_HEAD", "KITCHEN_STAFF"].includes(user.role)) {
      return json(403, { message: "Forbidden" });
    }
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const tickets = makeTickets();
    response.write(`: connected\n\ndata: ${JSON.stringify(tickets)}\n\n`);
    const updates = [];
    if (request.headers["x-playwright-workspace-sse"] === "distribution") {
      const stages = [
        "QUEUED", "QUEUED", "QUEUED",
        "PREPARING", "PREPARING", "PREPARING", "PREPARING", "PREPARING", "PREPARING",
        "READY", "CANCELLED", "HANDED_OVER",
      ];
      const mixed = stages.map((status, index) => ({
        ...tickets[index % tickets.length],
        kitchen_ticket_id: `distribution-${index}`,
        ticket_number: String(800 + index),
        status,
      }));
      const snapshots = [mixed, [{ ...mixed[0], status: "CHECKING" }], []];
      snapshots.forEach((snapshot, index) => {
        updates.push(setTimeout(() => {
          if (!response.writableEnded) response.write(`data: ${JSON.stringify(snapshot)}\n\n`);
        }, 1500 + index * 1800));
      });
    }
    const heartbeat = setInterval(() => {
      if (!response.writableEnded) response.write(": ping\n\n");
    }, 15_000);
    request.on("close", () => {
      clearInterval(heartbeat);
      updates.forEach(clearTimeout);
    });
    return;
  }

  if (request.method === "GET" && pathname === "/api/kitchen-ticket/today") {
    if (!["SUPERADMIN", "SUPERVISOR", "KITCHEN_HEAD", "KITCHEN_STAFF"].includes(user.role)) {
      return json(403, { message: "Forbidden" });
    }
    return json(200, makeTickets());
  }

  if (request.method === "GET" && pathname.startsWith("/api/kitchen-ticket/date/")) {
    if (!["SUPERADMIN", "SUPERVISOR", "KITCHEN_HEAD"].includes(user.role)) {
      return json(403, { message: "Forbidden" });
    }
    const day = pathname.split("/").at(-1);
    return json(200, day === todayManilaDate() ? makeTickets() : []);
  }

  if (request.method === "GET" && pathname.startsWith("/api/kitchen-qc/ticket/")) {
    return json(200, []);
  }

  if (request.method === "GET" && pathname === "/api/menu-catalog") {
    const availability = searchParams.get("availability") ?? "all";
    const brandId = searchParams.get("brand_id");
    let filtered = MENU_ITEMS;
    if (brandId) filtered = filtered.filter((m) => m.brand_id === brandId);
    if (availability === "available") filtered = filtered.filter((m) => m.is_available);
    if (availability === "unavailable") filtered = filtered.filter((m) => !m.is_available);

    const brandsCount = Object.fromEntries(
      BRANDS.map((b) => {
        const rows = MENU_ITEMS.filter((m) => m.brand_id === b.brand_id);
        return [b.brand_id, { total: rows.length, unavailable: rows.filter((m) => !m.is_available).length }];
      }),
    );

    return json(200, {
      data: filtered,
      meta: {
        page: 1,
        limit: Number(searchParams.get("limit") ?? 20),
        total: filtered.length,
        totalPages: 1,
        counts: {
          brands: brandsCount,
          availability: {
            all: MENU_ITEMS.length,
            available: MENU_ITEMS.filter((m) => m.is_available).length,
            unavailable: MENU_ITEMS.filter((m) => !m.is_available).length,
          },
        },
      },
    });
  }

  if (request.method === "GET" && pathname === "/api/recipes") {
    const status = searchParams.get("status") ?? "all";
    const brandId = searchParams.get("brand_id");
    const scoped = brandId ? RECIPES.filter((r) => r.brand_id === brandId) : RECIPES;
    const filtered =
      status === "active"
        ? scoped.filter((r) => r.is_active)
        : status === "inactive"
          ? scoped.filter((r) => !r.is_active)
          : scoped;

    return json(200, {
      data: filtered,
      meta: {
        page: 1,
        limit: Number(searchParams.get("limit") ?? 20),
        total: filtered.length,
        totalPages: 1,
        counts: {
          all: scoped.length,
          active: scoped.filter((r) => r.is_active).length,
          inactive: scoped.filter((r) => !r.is_active).length,
        },
      },
    });
  }

  return json(404, { message: `Unmocked request: ${request.method} ${request.url}` });
}).listen(Number(process.env.PLAYWRIGHT_FIXTURE_PORT ?? 3101), "127.0.0.1");
