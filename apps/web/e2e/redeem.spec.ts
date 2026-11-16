import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test("redeem and cash-out flow displays maturity breakdown, blocks early claims, and launches SEP-24 off-ramp", async ({
  page,
}) => {
  // 1. Attempt Early Claim on Unmatured Pot (Plain-Language Restriction Block)
  await page.goto("/pot/redeem?matured=false");
  await expect(page.getByTestId("pot-redeem-container")).toBeVisible();
  await expect(page.getByTestId("maturity-status-banner")).toBeVisible();
  await expect(page.getByText(/Locked in T-Bill/i)).toBeVisible();

  // Confirm early claim restriction block is rendered
  await expect(page.getByTestId("early-claim-restriction-block")).toBeVisible();
  await expect(
    page.getByText(
      /Claims cannot be processed because this Stokvel Pot has not reached its maturity date yet/i,
    ),
  ).toBeVisible();
  await expect(page.getByTestId("execute-claim-btn")).toBeDisabled();

  // 2. Matured & Settled Pot Claim Flow
  await page.goto("/pot/redeem?matured=true");
  await expect(page.getByTestId("pot-redeem-container")).toBeVisible();
  await expect(page.getByText(/Matured & Settled/i)).toBeVisible();

  // Check pro-rata breakdown values
  await expect(page.getByTestId("entitlement-breakdown-grid")).toBeVisible();
  await expect(page.getByText(/R\s?200[,.]00/i)).toBeVisible(); // Principal
  await expect(page.getByText(/\+R\s?4[,.]11/i)).toBeVisible(); // Yield
  await expect(page.getByTestId("total-payout-amount")).toHaveText(
    /R\s?204[,.]11/i,
  );

  // Execute Member Claim
  const claimBtn = page.getByTestId("execute-claim-btn");
  await expect(claimBtn).toBeEnabled();
  await claimBtn.click();

  // 3. Claim Receipt & Block Explorer Details
  await expect(page.getByTestId("claim-receipt-box")).toBeVisible();
  await expect(
    page.getByText(/Share Successfully Claimed to Wallet/i),
  ).toBeVisible();

  // Toggle transaction details drawer
  const toggleDetailsBtn = page.getByTestId("toggle-claim-tx-details");
  await toggleDetailsBtn.click();
  await expect(page.getByTestId("claim-tx-details-content")).toBeVisible();
  await expect(page.getByText(/tx_claim_/i)).toBeVisible();
  await expect(page.getByText(/Inspect on Stellar\.Expert/i)).toBeVisible();

  // 4. Launch Seamless SEP-24 Cash-Out
  const proceedCashoutBtn = page.getByTestId("proceed-cashout-btn");
  await expect(proceedCashoutBtn).toBeVisible();
  await proceedCashoutBtn.click();

  // Check that SEP-24 simulator component appears with prefilled amount
  await expect(page.getByTestId("sep24-cashout-section")).toBeVisible();
  await expect(
    page.getByText(/Simulated Cash-Out & Local Payout Rails \(SEP-24\)/i),
  ).toBeVisible();
  await expect(page.getByText(/SIMULATED RAIL - DEMO ONLY/i)).toBeVisible();
});
