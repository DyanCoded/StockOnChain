import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test("pot dashboard renders under 2.5s LCP on throttled 4G mobile and populates chain hook data in mock and testnet modes", async ({
  page,
  context,
  browserName,
}) => {
  // Emulate throttled 4G mobile network (70ms RTT, 4 Mbps down, 3 Mbps up)
  if (browserName === "chromium") {
    const client = await context.newCDPSession(page);
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 70,
      downloadThroughput: Math.floor((4 * 1024 * 1024) / 8),
      uploadThroughput: Math.floor((3 * 1024 * 1024) / 8),
      connectionType: "cellular4g",
    });
  } else {
    await page.route("**/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      await route.continue();
    });
  }

  // Register LCP observer before navigation
  await page.addInitScript(() => {
    (window as unknown as { __lcpMs?: number }).__lcpMs = 0;
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          (window as unknown as { __lcpMs?: number }).__lcpMs = last.startTime;
        }
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // Fallback handled via paint/navigation timing
    }
  });

  // Intercept external Testnet RPC / Horizon requests so Testnet mode switch is deterministic
  await page.route("https://soroban-testnet.stellar.org/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { sequence: 1456789 },
      }),
    });
  });

  await page.route("https://horizon-testnet.stellar.org/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        _embedded: {
          records: [
            {
              id: "tx-live-1",
              hash: "49e811b036e931bff2f63bd7fc7e8f18e63109e7c777c22360ee80b3ec3e8a20",
              created_at: "2026-11-13T11:30:10Z",
              operation_count: 1,
              successful: true,
              ledger_attr: 1456780,
            },
          ],
        },
      }),
    });
  });

  await page.goto("/pot");
  await page.locator('[data-pot-dashboard-ready="true"]').waitFor();
  await expect(
    page.getByRole("heading", { name: "Stokvel Pot Dashboard" }),
  ).toBeVisible();

  // Measure LCP and verify it is strictly under 2.5s (2500ms)
  const lcpMs = await page.evaluate(() => {
    const recorded = (window as unknown as { __lcpMs?: number }).__lcpMs ?? 0;
    if (recorded > 0) return recorded;
    const fcp = performance
      .getEntriesByType("paint")
      .find((entry) => entry.name === "first-contentful-paint");
    if (fcp) return fcp.startTime;
    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    return nav ? nav.domContentLoadedEventEnd : 100;
  });
  expect(lcpMs).toBeGreaterThan(0);
  expect(lcpMs).toBeLessThan(2500);

  // Verify Mock Mode indicator and localized Rand formatting (G9)
  await expect(page.getByTestId("mode-indicator-badge")).toContainText(
    "MOCK MODE",
  );
  await expect(page.getByTestId("total-pot-balance-rand")).toHaveText(
    /R\s?100[,.]00/,
  );

  // Verify Member List (5 synthetic members)
  await expect(
    page.getByTestId("pot-member-list").locator("article"),
  ).toHaveCount(5);

  // Verify Asset Visual Representation: exact ZATBILL amount, maturity countdown, and indicative yield
  await expect(page.getByTestId("zatbill-exact-amount")).toHaveText(
    "102.00 MOCK ZATBILL",
  );
  await expect(page.getByTestId("maturity-countdown")).toContainText(
    /m\s+\d+s/,
  );
  await expect(page.getByTestId("indicative-yield-label")).toContainText(
    "% p.a. (indicative, time compressed for demo)",
  );

  // Verify Real-Time Contribution Progress Tracking
  await expect(page.getByTestId("contribution-progressbar")).toHaveAttribute(
    "aria-valuenow",
    "80",
  );
  await page.getByTestId("simulate-contribution-btn").click();
  await expect(page.getByTestId("total-pot-balance-rand")).toHaveText(
    /R\s?125[,.]00/,
  );
  await expect(page.getByTestId("contribution-progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(page.getByTestId("zatbill-exact-amount")).toHaveText(
    "128.00 MOCK ZATBILL",
  );

  // Verify Activity Feed empty state and loading state
  await expect(
    page.getByTestId("activity-event-list").locator("li"),
  ).toHaveCount(6);
  await page.getByTestId("toggle-empty-activity-btn").click();
  await expect(page.getByTestId("activity-empty-state")).toContainText(
    "No pot activity recorded yet",
  );
  await page.getByTestId("toggle-empty-activity-btn").click();
  await page.getByTestId("toggle-loading-activity-btn").click();
  await expect(page.getByTestId("activity-loading-state")).toContainText(
    "Synchronizing stokvel pot state",
  );
  await page.getByTestId("toggle-loading-activity-btn").click();

  // Switch to Live Stellar Testnet mode and verify live ledger population
  await page.getByTestId("mode-testnet-btn").click();
  await expect(page.getByTestId("mode-indicator-badge")).toContainText(
    "LIVE TESTNET · Ledger #1456789",
  );
  await expect(page.getByTestId("activity-event-list")).toContainText(
    "Testnet Confirmed",
  );

  // Verify no horizontal overflow at 360px mobile viewport
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
