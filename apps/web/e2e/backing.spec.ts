import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

test.describe("A-06 · Proof-of-backing transparency & reserve audit (zatbill)", () => {
  test("renders 5-stage Visual Asset Chain with B-02 entity names and mock badges", async ({
    page,
  }) => {
    await page.goto("/assets");

    const container = page.locator(
      '[data-testid="proof-of-backing-container"]',
    );
    await expect(container).toBeVisible();

    // Verify Visual Asset Chain section
    const assetChain = page.locator('[data-testid="visual-asset-chain"]');
    await expect(assetChain).toBeVisible();

    // Step 1: RSA Sovereign T-bill
    const step1 = page.locator('[data-testid="asset-chain-step-1"]');
    await expect(step1).toBeVisible();
    await expect(step1).toContainText("RSA National Treasury / SARB");
    await expect(step1).toContainText("SIMULATED ASSET");

    // Step 2: CSDP / Strate Custody
    const step2 = page.locator('[data-testid="asset-chain-step-2"]');
    await expect(step2).toBeVisible();
    await expect(step2).toContainText(
      "Strate CSD / Mock Custodian Services (Pty) Ltd",
    );
    await expect(step2).toContainText("MOCK CUSTODIAN");

    // Step 3: Insolvency-Remote SPV (B-02)
    const step3 = page.locator('[data-testid="asset-chain-step-3"]');
    await expect(step3).toBeVisible();
    await expect(step3).toContainText(
      "StockOnChain Treasury SPV (RF) (Pty) Ltd",
    );
    await expect(step3).toContainText("RING-FENCED SPV");

    // Step 4: Digital Token on Stellar Testnet
    const step4 = page.locator('[data-testid="asset-chain-step-4"]');
    await expect(step4).toBeVisible();
    await expect(step4).toContainText("MOCK ZATBILL on Stellar Testnet");
    await expect(step4).toContainText("STELLAR TESTNET");

    // Step 5: Stokvel Member Pool Share
    const step5 = page.locator('[data-testid="asset-chain-step-5"]');
    await expect(step5).toBeVisible();
    await expect(step5).toContainText("Stokvel Community Pot");
    await expect(step5).toContainText("COMMUNITY POOL");
  });

  test("displays dynamic backing-ratio gauge and completes 2-click attestation verification", async ({
    page,
  }) => {
    await page.goto("/assets");

    // 1. Initial Solvency state: fully backed (102.56%)
    const ratioPercent = page.locator('[data-testid="backing-ratio-percent"]');
    await expect(ratioPercent).toContainText("102.56%");

    const statusBadge = page.locator('[data-testid="backing-status-badge"]');
    await expect(statusBadge).toContainText("Fully Collateralized & Solvent");

    // Reserve deficit alert should NOT be present initially
    const deficitAlert = page.locator('[data-testid="reserve-deficit-alert"]');
    await expect(deficitAlert).not.toBeVisible();

    // Attestation metadata table
    const asOfDate = page.locator('[data-testid="attestation-as-of-date"]');
    await expect(asOfDate).toBeVisible();

    const sha256Hash = page.locator('[data-testid="attestation-sha256-hash"]');
    await expect(sha256Hash).toContainText(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );

    // 2-Click Verification Flow:
    // Click 1: Click "Verify Attestation Now" button
    const verifyBtn = page.locator('[data-testid="verify-attestation-btn"]');
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // Cryptographic checklist appears after verification
    const checklist = page.locator('[data-testid="verification-checklist"]');
    await expect(checklist).toBeVisible();
    await expect(
      page.locator('[data-testid="check-pdf-sha256"]'),
    ).toContainText(/Matched/i);
    await expect(page.locator('[data-testid="check-signature"]')).toContainText(
      /valid/i,
    );
    await expect(
      page.locator('[data-testid="check-onchain-anchor"]'),
    ).toContainText(/Matched/i);
    await expect(page.locator('[data-testid="check-solvency"]')).toContainText(
      /backed|solvent/i,
    );

    // Click 2: Inspect On-Chain Hash on Stellar.Expert
    const inspectLink = page.locator(
      '[data-testid="inspect-onchain-hash-link"]',
    );
    await expect(inspectLink).toBeVisible();
    const href = await inspectLink.getAttribute("href");
    expect(href).toMatch(/stellar\.expert\/explorer\/testnet\/account/);
  });

  test("triggers and displays below-100% reserve deficit warning state", async ({
    page,
  }) => {
    await page.goto("/assets");

    // Initially fully backed
    await expect(
      page.locator('[data-testid="reserve-deficit-alert"]'),
    ).not.toBeVisible();

    // Toggle deficit warning mode (85%)
    const toggleBtn = page.locator('[data-testid="toggle-deficit-mode-btn"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Reserve deficit alert must be displayed prominently
    const deficitAlert = page.locator('[data-testid="reserve-deficit-alert"]');
    await expect(deficitAlert).toBeVisible();
    await expect(deficitAlert).toContainText(
      "Reserve Deficit Alert: Under-Collateralized",
    );
    await expect(deficitAlert).toContainText("85.00%");

    // Ratio percent must reflect 85.00%
    await expect(
      page.locator('[data-testid="backing-ratio-percent"]'),
    ).toContainText("85.00%");

    // Status badge must reflect under-collateralized deficit
    await expect(
      page.locator('[data-testid="backing-status-badge"]'),
    ).toContainText("Under-Collateralized Deficit");

    // Direct URL with ?demo_deficit=true should also initialize in deficit mode
    await page.goto("/assets?demo_deficit=true");
    await expect(
      page.locator('[data-testid="reserve-deficit-alert"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="backing-ratio-percent"]'),
    ).toContainText("85.00%");
  });

  test("renders plain-language What Could Go Wrong risk explainer section", async ({
    page,
  }) => {
    await page.goto("/assets");

    const riskSection = page.locator(
      '[data-testid="what-could-go-wrong-section"]',
    );
    await expect(riskSection).toBeVisible();
    await expect(riskSection).toContainText("What Could Go Wrong?");

    // 5 dedicated risk cards
    await expect(
      page.locator('[data-testid="risk-card-sovereign"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="risk-card-custodian"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="risk-card-custodian"]'),
    ).toContainText("StockOnChain Treasury SPV (RF) (Pty) Ltd");
    await expect(
      page.locator('[data-testid="risk-card-smart-contract"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="risk-card-liquidity"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="risk-card-stablecoin"]'),
    ).toBeVisible();
  });

  test("verifies direct cross-links to stellar.toml, custody statement PDF, and raw JSON", async ({
    page,
  }) => {
    await page.goto("/assets");

    // Cross-link 1: stellar.toml
    const tomlLink = page.locator('[data-testid="stellar-toml-link"]');
    await expect(tomlLink).toBeVisible();
    await expect(tomlLink).toHaveAttribute("href", "/.well-known/stellar.toml");

    // Cross-link 2: mock custody statement PDF
    const pdfLink = page.locator('[data-testid="download-pdf-link"]');
    await expect(pdfLink).toBeVisible();
    const pdfHref = await pdfLink.getAttribute("href");
    expect(pdfHref).toContain("mock-custody-statement.pdf");

    // Cross-link 3: raw attestation JSON
    const jsonLink = page.locator('[data-testid="attestation-json-link"]');
    await expect(jsonLink).toBeVisible();
    const jsonHref = await jsonLink.getAttribute("href");
    expect(jsonHref).toContain("zatbill-attestation.json");
  });

  test("supports isiZulu localization on /assets?lang=zu", async ({ page }) => {
    await page.goto("/assets?lang=zu");

    const container = page.locator(
      '[data-testid="proof-of-backing-container"]',
    );
    await expect(container).toBeVisible();

    // Verify isiZulu headings
    await expect(container).toContainText(
      "Ubufakazi Bokusekelwa Nokusobala Kwezimali Ezibekiwe",
    );
    await expect(container).toContainText(
      "Uhlelo Lwezimpahla Nezinhlaka Ze-SPV (B-02)",
    );

    // Toggle button in isiZulu
    const toggleBtn = page.locator('[data-testid="toggle-deficit-mode-btn"]');
    await expect(toggleBtn).toContainText("Shintshela Esimweni Sokushoda");
  });
});
