import { expect, test, type Locator, type Page } from "@playwright/test";

function segmentShares(distribution: Locator) {
  return distribution.evaluate((track) =>
    Array.from(track.children, (segment) =>
      Math.round(100 * segment.getBoundingClientRect().width / track.getBoundingClientRect().width),
    ),
  );
}

async function signInAs(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill("qa-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: /Good (morning|afternoon|evening)|Welcome/ })).toBeVisible();
}

test.describe("Workspace across web roles", () => {
  test("SUPERADMIN renders static business date, centered logos (light & dark), live SSE proportions, and click-throughs", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await signInAs(page, "qa-superadmin");

    // Verify historical date navigation is absent and current Manila date renders
    await expect(page.getByRole("button", { name: /Previous business day/i })).toHaveCount(0);
    await expect(page.locator("main input[type=date]")).toHaveCount(0);
    const date = page.getByLabel(/^Manila business date/);
    await expect(date).toBeVisible();
    const day = await date.getAttribute("datetime");

    // Summary strip shows real counts (4 orders: 3 paid, 1 unpaid)
    const ordersRegion = page.getByRole("region", { name: "Today's orders" });
    await expect(ordersRegion.getByText("4")).toBeVisible();
    await expect(ordersRegion.getByText("3")).toBeVisible();
    await expect(ordersRegion.getByText("1")).toBeVisible();

    const brandsSection = page.getByRole("region", { name: "Your brands" });
    const themeSwitch = page.getByRole("switch", { name: "Dark mode" });
    for (const theme of ["light", "dark"] as const) {
      const dark = theme === "dark";
      if (await themeSwitch.getAttribute("aria-checked") !== String(dark)) await themeSwitch.click();

      for (const [name, lightAsset, darkAsset, width] of [
        ["Gamcheon", "Gamcheon", "gamcheon", 68],
        ["Aurelia's Inasal", "AureliasInasal", "aurelias-inasal", 132],
        ["King Kungs Kafé", "KingKungsKafe", "king-kungs-kafe", 208],
      ] as const) {
        const img = brandsSection.getByRole("img", { name, exact: true }).locator("img:visible");
        await expect(img).toHaveAttribute("src", new RegExp(`/${dark ? darkAsset : lightAsset}\\.`));
        await expect.poll(() => img.evaluate((el) => el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0))
          .toBe(true);
        const placement = await img.evaluate((el) => {
          const logo = el.getBoundingClientRect();
          const card = el.closest("article")?.getBoundingClientRect();
          return {
            width: logo.width,
            centered: card && Math.abs(logo.x + logo.width / 2 - card.x - card.width / 2) < 1,
            backing: getComputedStyle(el.parentElement!).backgroundColor,
          };
        });
        expect(placement).toEqual({ width, centered: true, backing: "rgba(0, 0, 0, 0)" });
      }
    }

    await expect(page.getByText("Live", { exact: true })).toHaveCount(0);
    await expect(page.getByText("5 open", { exact: true })).toBeVisible();
    const distribution = page.getByRole("img", { name: /^Active ticket distribution/ });
    expect(await segmentShares(distribution)).toEqual([20, 20, 20, 20, 20]);

    // Navigate from Paid orders -> filtered Orders page
    await ordersRegion.getByRole("link", { name: /^Paid orders/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/orders\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}&payment=PAID/);
    await expect(page.getByRole("heading", { name: "Orders", level: 1 })).toBeVisible();
    await expect(page.getByRole("table").getByText("GC-00104")).toBeVisible();

    // Navigate back and inspect flagged rework ticket -> auto-opens modal on Kitchen Overview
    await page.goto("/dashboard");
    await expect(page.getByText("#104")).toBeVisible();
    await page.getByRole("link", { name: "Inspect ticket 104" }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/kitchen-overview\\?day=${day}&ticket=`));
    await expect(page.getByRole("dialog").getByText(/104/).first()).toBeVisible();

    // Navigate back and click GC Unavailable items -> filtered Menu page
    await page.goto("/dashboard");
    await page
      .getByRole("region", { name: "Your brands" })
      .getByRole("link", { name: /Unavailable items/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/menu\?brand=GC&availability=unavailable/);
    await expect(page.getByRole("table").getByText("Spicy Bulgogi Rice Bowl")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("SUPERVISOR renders workspace and filters by kitchen stage cleanly", async ({ page }) => {
    await signInAs(page, "qa-supervisor");
    await page.goto("/dashboard?day=2026-10-01");
    await expect(page.getByText("5 open")).toBeVisible();
    await expect(page.getByText(/Supervisor workspace/i)).toBeVisible();
    await page.getByRole("link", { name: /Rework/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/kitchen-overview\?day=\d{4}-\d{2}-\d{2}&stage=REWORKING/);
    await expect(page.getByRole("table").getByText("104", { exact: true })).toBeVisible();
    const date = page.locator("main input[type=date]");
    await expect(date).toBeVisible();
    await date.fill("2026-10-01");
    await expect(page).toHaveURL(/day=2026-10-01/);
  });

  test("native SSE redistributes the rendered chart as the workload changes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/kitchen-ticket/today/stream", (route) =>
      route.continue({ headers: { ...route.request().headers(), "x-playwright-workspace-sse": "distribution" } }),
    );
    await signInAs(page, "qa-kitchen");
    const chart = page.getByRole("img", { name: /^Active ticket distribution/ });

    await expect(chart).toHaveAccessibleName(/Queued 3 \(30%\), Preparing 6 \(60%\), Ready 1 \(10%\)/);
    expect(await segmentShares(chart)).toEqual([30, 60, 10]);
    await expect(chart).toHaveAccessibleName(/In QC 1 \(100%\)/);
    expect(await segmentShares(chart)).toEqual([100]);
    await expect(page.getByText("No active kitchen tickets.")).toBeVisible();
    await expect(chart).toHaveCount(0);
    await expect(page.getByText("Live", { exact: true })).toHaveCount(0);
  });

  test("KITCHEN_HEAD omits orders/payment strip and prioritizes kitchen activity", async ({ page }) => {
    await signInAs(page, "qa-kitchen");
    await expect(page.getByRole("region", { name: "Kitchen summary" })).toBeVisible();
    await expect(page.getByText("Orders today")).toHaveCount(0);
    await expect(page.getByText("Paid orders")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Kitchen activity" })).toBeVisible();
  });

  test("RECIPE_MANAGER renders recipe summary, recent recipes, and brand recipe counts only", async ({ page }) => {
    await signInAs(page, "qa-recipes");
    const recipeSummary = page.getByRole("region", { name: "Recipe overview" });
    await expect(recipeSummary.getByText("4")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recently updated recipes" })).toBeVisible();
    await expect(page.getByText("Spicy Bulgogi Sauce")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kitchen activity" })).toHaveCount(0);
    await expect(page.getByText("Orders today")).toHaveCount(0);

    await page
      .getByRole("region", { name: "Your brands" })
      .getByRole("link", { name: /Inactive/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/recipes\?brand=GC&status=inactive/);
    await expect(page.getByRole("table").getByText("Pork Belly Marinade")).toBeVisible();
  });

  test("desktop, laptop, tablet, and mobile viewports keep zero horizontal overflow", async ({ page }) => {
    await signInAs(page, "qa-superadmin");

    for (const vp of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(vp);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `Viewport ${vp.width}x${vp.height} should have zero horizontal overflow`).toBe(false);
    }

    const box = await page.getByRole("button", { name: "Refresh workspace data" }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
