import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test.describe("Q-01 · UX QA & Timed User Flows (Under 2 Minutes Active Time)", () => {
  test("Flow A: Complete onboarding-to-contribution journey (verify → contribute) in under 2 minutes", async ({
    page,
  }) => {
    const startTime = Date.now();

    // 1. Start from Homepage / Onboarding entry
    await page.goto("/");
    await page
      .getByRole("radio", { name: /Email.*member@example\.test/ })
      .check();
    await page.getByRole("button", { name: "Continue" }).click();

    // 2. Complete Onboarding Synthetic Verification Check
    await expect(page).toHaveURL(/\/onboarding\?contact=email/);
    await page.locator('[data-onboarding-ready="true"]').waitFor();
    await page
      .getByLabel(
        "I have read this privacy notice and agree to run the synthetic demo check.",
      )
      .check();
    await page.getByRole("button", { name: "Check sample details" }).click();
    await expect(page.getByText("Screen 3 of 3")).toBeVisible();

    // 3. Navigate to Contribution Flow
    await page.goto("/pot/contribute");
    await expect(page.getByTestId("pot-contribute-card")).toBeVisible();

    // Instant Top-Up check if balance is low
    const topUpBtn = page.getByTestId("instant-topup-btn");
    await topUpBtn.click();
    await expect(page.getByTestId("topup-notice")).toBeVisible();

    // 4. One-Tap Contribution (R 50,00)
    const quickBtn50 = page.getByTestId("quick-amount-50");
    await quickBtn50.click();

    const submitBtn = page.getByTestId("one-tap-contribute-btn");
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 5. Verify Receipt and Confirmation Screen
    const receipt = page.getByTestId("contribution-receipt");
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText(/Contribution Confirmed!/i);

    // Measure Elapsed Active Time
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    // Benchmark target is under 120 seconds (2 minutes)
    expect(elapsedSeconds).toBeLessThan(120);
  });

  test("Flow B: Complete redemption-to-cashout journey (claim → cash out) in under 2 minutes", async ({
    page,
  }) => {
    const startTime = Date.now();

    // 1. Navigate to Redeem Flow with Matured Pot State
    await page.goto("/pot/redeem?matured=true");
    await expect(page.getByTestId("pot-redeem-container")).toBeVisible();

    // Verify Maturity Status Banner
    const maturityBanner = page.getByTestId("maturity-status-banner");
    await expect(maturityBanner).toBeVisible();
    await expect(maturityBanner).toContainText(/Matured & Settled/i);

    // 2. Claim My Share Action
    const claimBtn = page.getByTestId("execute-claim-btn");
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();

    // Verify Claim Receipt Box
    const claimReceipt = page.getByTestId("claim-receipt-box");
    await expect(claimReceipt).toBeVisible();
    await expect(claimReceipt).toContainText(
      /Share Successfully Claimed to Wallet/i,
    );

    // 3. Launch Seamless SEP-24 Cash-Out
    const proceedCashoutBtn = page.getByTestId("proceed-cashout-btn");
    await expect(proceedCashoutBtn).toBeVisible();
    await proceedCashoutBtn.click();

    // Verify SEP-24 Cash-Out Section
    const sep24Section = page.getByTestId("sep24-cashout-section");
    await expect(sep24Section).toBeVisible();
    await expect(sep24Section).toContainText(
      /Simulated Cash-Out & Local Payout Rails/i,
    );

    // Measure Elapsed Active Time
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    // Benchmark target is under 120 seconds (2 minutes)
    expect(elapsedSeconds).toBeLessThan(120);
  });

  test("Accessibility & Screen Reader Semantics: landmark regions, alerts, and live announcements", async ({
    page,
  }) => {
    await page.goto("/assets");

    // Landmarks
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("header.topbar")).toBeVisible();

    // Check heading hierarchy
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Check ARIA alerts
    await page.goto("/pot/contribute?verified=false");
    const alertBox = page.getByTestId("unverified-guard-box");
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toHaveAttribute("role", "alert");
  });

  test("Offline Fallback Shell: displays clear offline notice without crashing", async ({
    page,
  }) => {
    await page.goto("/offline.html");
    await expect(page.locator("h1")).toContainText(/You are offline/i);
    await expect(page.locator("main")).toContainText(
      /Reconnect to the internet to continue/i,
    );
  });
});
