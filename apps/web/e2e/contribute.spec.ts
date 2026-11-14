import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test("one-tap contribute flow enforces verification, caps, top-up, and confirmation receipt", async ({
  page,
}) => {
  // 1. Unverified State (A-01 Guardrail)
  await page.goto("/pot/contribute?verified=false");
  await expect(page.getByTestId("unverified-guard-box")).toBeVisible();
  await expect(page.getByText(/Verification Required/i)).toBeVisible();
  await expect(page.getByTestId("one-tap-contribute-btn")).toBeDisabled();

  // 2. Closed Window State
  await page.goto("/pot/contribute?state=Invested");
  await expect(page.getByTestId("closed-window-box")).toBeVisible();
  await expect(page.getByText(/Pot State: Invested/i)).toBeVisible();
  await expect(page.getByTestId("one-tap-contribute-btn")).toBeDisabled();

  // 3. Normal Active Flow with Top-Up
  await page.goto("/pot/contribute");
  await expect(page.getByTestId("pot-contribute-card")).toBeVisible();

  // Check initial balance
  await expect(page.getByText(/R 150,00/i)).toBeVisible();

  // Click Instant Top-Up
  const topUpBtn = page.getByTestId("instant-topup-btn");
  await topUpBtn.click();
  await expect(page.getByTestId("topup-notice")).toBeVisible();
  // Balance should now reflect R 250,00
  await expect(page.getByText(/R 250,00/i)).toBeVisible();

  // 4. Test Over-Cap Input
  const amountInput = page.getByTestId("custom-amount-input");
  await amountInput.fill("150"); // Remaining cap is R 100,00 (300 cap - 200 already contributed)
  const submitBtn = page.getByTestId("one-tap-contribute-btn");
  await submitBtn.click();

  await expect(page.getByTestId("contribute-error-message")).toBeVisible();
  await expect(page.getByText(/Contribution Cap Exceeded/i)).toBeVisible();
  await expect(page.getByText(/Reduce your contribution/i)).toBeVisible();

  // 5. Valid Contribution Submission (R 50,00)
  const quickBtn50 = page.getByTestId("quick-amount-50");
  await quickBtn50.click();
  await submitBtn.click();

  // 6. Confirmed Receipt & Member Share View
  await expect(page.getByTestId("contribution-receipt")).toBeVisible();
  await expect(page.getByText(/Contribution Confirmed!/i)).toBeVisible();
  await expect(page.getByText(/Confirmed on Testnet/i)).toBeVisible();
  await expect(page.getByText(/R 50,00/i).first()).toBeVisible();

  // Updated member share percentage displayed
  await expect(page.getByText(/Updated Member Share/i)).toBeVisible();
  await expect(page.getByText(/31\.3%/i)).toBeVisible();

  // 7. Details Drawer & Block Explorer Link
  const toggleDetailsBtn = page.getByTestId("toggle-details-btn");
  await toggleDetailsBtn.click();
  await expect(page.getByTestId("receipt-details-drawer")).toBeVisible();
  await expect(page.getByText(/tx_contrib_/i)).toBeVisible();
  await expect(
    page.getByText(/Inspect on Stellar\.Expert Explorer/i),
  ).toBeVisible();
});
