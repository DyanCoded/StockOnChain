import { expect, test } from "@playwright/test";

test.describe("A-03 · Create and join a pot", () => {
  test("completes the full cycle of creating a pot, generating an invite (direct link & WhatsApp), reviewing rules/RiskExplainer, verifying comprehension, and joining on Testnet", async ({
    page,
  }) => {
    await page.goto("/pot/create");
    await expect(page.locator("[data-pot-create-ready='true']")).toBeVisible();

    // Verify all 4 term options exist (91, 182, 364 days, and 120s demo bill)
    await expect(page.getByTestId("term-option-standard91Day")).toBeVisible();
    await expect(page.getByTestId("term-option-standard182Day")).toBeVisible();
    await expect(page.getByTestId("term-option-standard364Day")).toBeVisible();
    await expect(
      page.getByTestId("term-option-demoTimeCompressed"),
    ).toBeVisible();

    // Select 182-day term and configure monthly contribution (R 50,00) & per-member cap (R 300,00)
    await page.getByTestId("term-option-standard182Day").click();
    await page.getByTestId("preset-monthly-50").click();
    await page.getByTestId("preset-cap-300").click();

    await page.getByTestId("wizard-continue-step2-btn").click();

    // Step 2: Verify automatic Treasurer assignment and member list
    await expect(page.getByTestId("wizard-step-2")).toBeVisible();
    await expect(page.getByTestId("creator-treasurer-card")).toContainText(
      "Nandi M. (Synthetic Treasurer)",
    );
    await expect(
      page.getByTestId("creator-treasurer-role-badge"),
    ).toContainText("Treasurer");

    // Add synthetic member and create pot on Testnet
    await page.getByTestId("add-synthetic-member-btn").click();
    await page.getByTestId("wizard-create-pot-btn").click();

    // Step 3: Verify created pot summary, direct invitation link, and WhatsApp sharing
    await expect(page.getByTestId("wizard-step-3")).toBeVisible();
    await expect(page.getByTestId("created-pot-term")).toContainText(
      "182 Days",
    );
    await expect(page.getByTestId("created-pot-treasurer")).toContainText(
      "Treasurer",
    );
    await expect(page.getByTestId("created-pot-monthly")).toContainText("R");
    await expect(page.getByTestId("created-pot-cap")).toContainText("300");

    const inviteUrl = await page
      .getByTestId("direct-invite-link-input")
      .inputValue();
    expect(inviteUrl).toContain("/pot/join?invite=");

    await page.getByTestId("copy-invite-link-btn").click();
    await expect(page.getByTestId("copied-invite-status")).toBeVisible();

    const whatsappHref = await page
      .getByTestId("whatsapp-share-link")
      .getAttribute("href");
    expect(whatsappHref).toContain("https://wa.me/?text=");

    await page.getByTestId("simulate-whatsapp-dispatch-btn").click();
    await expect(page.getByTestId("whatsapp-message-preview")).toContainText(
      "docs/POT_RULES.md",
    );

    // Follow the generated invitation link to the Join screen
    await page.getByTestId("open-join-flow-link").click();
    await expect(page.locator("[data-pot-join-ready='true']")).toBeVisible();

    // Verify Join screen displays invited pot details, docs/POT_RULES.md summary, D-01 glossary, and RiskExplainer
    await expect(page.getByTestId("join-pot-term")).toContainText("182 Days");
    await expect(page.getByTestId("pot-rules-section")).toContainText("Open");
    await expect(page.getByTestId("pot-rules-section")).toContainText(
      "Invested",
    );
    await expect(page.getByTestId("pot-rules-section")).toContainText(
      "Matured",
    );
    await expect(page.getByTestId("pot-rules-section")).toContainText(
      "Settled",
    );
    await expect(page.getByTestId("d01-glossary-section")).toContainText(
      "Stokvel",
    );
    await expect(page.getByTestId("d01-glossary-section")).toContainText(
      "Treasurer",
    );
    await expect(page.getByTestId("join-risk-explainer-section")).toContainText(
      "Understand the risks",
    );

    // Confirm button must be disabled before reviewing RiskExplainer and passing comprehension check
    const confirmBtn = page.getByTestId("confirm-join-pot-btn");
    await expect(confirmBtn).toBeDisabled();

    // Check mandatory Risk Explainer and Pool Rules checkboxes
    await page.getByTestId("review-risk-explainer-checkbox").check();
    await page.getByTestId("accept-pot-rules-checkbox").check();
    await expect(confirmBtn).toBeDisabled();

    // Complete the non-technical rule comprehension check (3/3)
    await page
      .getByTestId(
        "comprehension-q-maturityLockup-after_maturity_and_settlement",
      )
      .check();
    await page
      .getByTestId(
        "comprehension-q-yieldAndMockStatus-not_guaranteed_and_simulated_testnet",
      )
      .check();
    await page
      .getByTestId(
        "comprehension-q-memberCapAndAllowlist-allowlisted_members_and_cap_enforced",
      )
      .check();

    await expect(
      page.getByTestId("comprehension-summary-status"),
    ).toContainText("Verified:");
    await expect(confirmBtn).toBeEnabled();

    // Confirm and join on Testnet
    await confirmBtn.click();

    await expect(page.getByTestId("join-pot-success-card")).toBeVisible();
    await expect(page.getByTestId("joined-member-name")).toContainText(
      "Zanele P. (Synthetic Member)",
    );
    await expect(page.getByTestId("joined-comprehension-proof")).toContainText(
      "Verified:",
    );
    const txHref = await page
      .getByTestId("joined-pot-tx-link")
      .getAttribute("href");
    expect(txHref).toContain(
      "https://horizon-testnet.stellar.org/transactions/",
    );
  });
});
