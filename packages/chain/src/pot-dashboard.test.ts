import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchLiveTestnetPotDashboardData,
  formatMaturityCountdown,
  formatRandAmount,
  getMockPotDashboardData,
  usePotDashboard,
} from "./pot-dashboard";

test("pot-dashboard - formatRandAmount enforces localized en-ZA Rand formatting", () => {
  const formatted = formatRandAmount(100);
  assert.match(formatted, /R\s?100[,.]00/);
  assert.throws(() => formatRandAmount(Number.NaN), RangeError);
});

test("pot-dashboard - formatMaturityCountdown computes remaining days, hours, minutes, and seconds", () => {
  const nowMs = 1_700_000_000_000;
  const maturitySec = Math.floor(nowMs / 1000) + 95;
  const cd = formatMaturityCountdown(maturitySec, 120, nowMs);
  assert.equal(cd.remainingSeconds, 95);
  assert.equal(cd.minutes, 1);
  assert.equal(cd.seconds, 35);
  assert.equal(cd.isMatured, false);
  assert.equal(cd.formatted, "1m 35s");

  const matured = formatMaturityCountdown(
    Math.floor(nowMs / 1000) - 10,
    120,
    nowMs,
  );
  assert.equal(matured.remainingSeconds, 0);
  assert.equal(matured.isMatured, true);
  assert.equal(matured.formatted, "Matured (0s remaining)");
});

test("pot-dashboard - getMockPotDashboardData populates pot summary, members, ZATBILL holdings, yield, and activity", () => {
  const data = getMockPotDashboardData();
  assert.equal(data.mode, "mock");
  assert.equal(data.isMock, true);
  assert.match(data.modeBadgeLabel, /MOCK MODE/);
  assert.equal(data.totalBalanceMzar, 100);
  assert.match(data.totalBalanceFormatted, /R\s?100[,.]00/);
  assert.equal(data.members.length, 5);
  assert.equal(data.holdings.assetCode, "MOCK ZATBILL");
  assert.equal(data.holdings.zatbillHeldUnits, 102);
  assert.match(data.holdings.indicativeYieldLabel, /% p\.a\. \(indicative/);
  assert.ok(data.activity.length >= 5);
});

test("pot-dashboard - usePotDashboard operates in both mock mode and live testnet mode with contribution & empty-feed states", async () => {
  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("soroban-testnet")) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: { sequence: 1456789 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        _embedded: {
          records: [
            {
              id: "tx-1",
              hash: "49e811b036e931bff2f63bd7fc7e8f18e63109e7c777c22360ee80b3ec3e8a20",
              created_at: "2026-11-13T11:30:10Z",
              operation_count: 1,
              successful: true,
              ledger_attr: 1456780,
            },
          ],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const hook = usePotDashboard({
    initialMode: "mock",
    fetchImpl: fakeFetch,
  });

  assert.equal(hook.mode, "mock");
  assert.equal(hook.data.totalBalanceMzar, 100);
  assert.equal(hook.data.contributionProgressPercent, 80);

  // Real-time contribution progress update
  hook.simulateContribution(25);
  assert.equal(hook.data.totalBalanceMzar, 125);
  assert.equal(hook.data.contributionProgressPercent, 100);
  assert.equal(hook.data.activity[0]?.type, "contributed");

  // Switch to empty activity state
  hook.toggleEmptyActivity(true);
  assert.equal(hook.isEmptyActivity, true);
  assert.equal(hook.data.activity.length, 0);

  // Restore activity feed and switch to live testnet mode
  hook.toggleEmptyActivity(false);
  const testnetData = await hook.setMode("testnet");
  assert.equal(hook.mode, "testnet");
  assert.equal(testnetData.mode, "testnet");
  assert.equal(testnetData.latestLedger, 1456789);
  assert.match(testnetData.modeBadgeLabel, /LIVE TESTNET · Ledger #1456789/);
  assert.equal(testnetData.activity[0]?.status, "testnet_confirmed");

  // Verify standalone live testnet fetcher
  const directTestnet = await fetchLiveTestnetPotDashboardData({
    fetchImpl: fakeFetch,
  });
  assert.equal(directTestnet.mode, "testnet");
  assert.equal(directTestnet.latestLedger, 1456789);
});
