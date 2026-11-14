import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

test("full lifecycle and T-08 failure handling across Testnet and mock flows", async ({
  page,
}) => {
  // 1. Visit Health Endpoint
  const healthResponse = await page.request.get("/api/health");
  expect(healthResponse.status()).toBe(200);
  const healthData = await healthResponse.json();
  expect(healthData.status).toBe("ok");
  expect(healthData.checks.testnetGuardrail).toBe("healthy");

  // 2. Onboarding & Verification Flow (T-03)
  await page.goto("/onboarding?contact=email");
  await page.locator('[data-onboarding-ready="true"]').waitFor();

  // Synthetic South African ID check
  const idInput = page.getByLabel("13-digit sample identity number");
  await expect(idInput).toHaveValue("9001015000085");
  const consentCheckbox = page.getByLabel(
    "I have read this privacy notice and agree to run the synthetic demo check.",
  );
  await consentCheckbox.check();

  const checkButton = page.getByRole("button", {
    name: "Check sample details",
  });
  await expect(checkButton).toBeEnabled();
  await checkButton.click();

  // Confirm verification flow transitions to final step
  await expect(page.getByText("Screen 3 of 3")).toBeVisible();
  await expect(page.locator(".error-state strong")).toHaveText(
    "Not verified yet",
  );
  await expect(
    page.getByText(/no real identity verification or wallet setup/i),
  ).toBeVisible();

  // 3. Pot Dashboard & Progression (A-02)
  await page.goto("/pot");
  await expect(page.locator("body")).toBeVisible();

  // Verify prominent mode labels (G6 honesty)
  await expect(
    page.getByText(/MOCK MODE|TESTNET MODE|STELLAR TESTNET/i).first(),
  ).toBeVisible();

  // Verify South African Rand formatting on dashboard (G9)
  await expect(page.getByText(/R\s?\d+/i).first()).toBeVisible();

  // 4. Test T-08 Failure Scenarios
  // Test Backing API deficit warning toggle
  const backingDeficit = await page.request.get(
    "/api/backing?demo_deficit=true",
  );
  expect(backingDeficit.status()).toBe(200);
  const deficitData = await backingDeficit.json();
  expect(deficitData.is_fully_backed).toBe(false);
  expect(deficitData.status).toBe("deficit_warning");

  // 5. Test Cashout Simulation (I-02)
  await page.goto("/advanced-wallet");
  await expect(page.locator("body")).toBeVisible();
  const title = page.getByText(/Freighter|Custodian|Advanced|Wallet/i).first();
  await expect(title).toBeVisible();
});
