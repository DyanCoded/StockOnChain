# AI Prompt & Change Log (G10)

This log tracks notable AI prompts, tasks, and code changes made across the repository in accordance with guideline **G10 (Transparency)**.

---

## Log Entries

### [2026-11-10] Setup & Repository Initialization (S-01)
* **Prompt / Task:** Initialize repository structure (`contracts/stokvel-pot`, `apps/web`, `packages/chain`, `services/api`, `scripts`, `docs`) and configure environment & AI guidelines.
* **Changes:**
  - Configured toolchains (Rust GNU toolchain with `wasm32v1-none` target, Stellar CLI `30.0.1`, Node 20 LTS via `fnm`, pnpm).
  - Configured git-ignored `.env` and `.env.example` with multi-role accounts (Admin, Issuer, Dealer, Custodian, Sponsor).
  - Scaffolded `contracts/stokvel-pot` with `StokvelPotContract` multi-role permissions; verified with `cargo test` and `stellar contract build`.
  - Added [AI_GUIDELINES.md](../AI_GUIDELINES.md) with guidelines G1 through G10.


### [2026-11-10] README Plan & Structure Incorporation
* **Prompt / Task:** Incorporate comprehensive 16-section README plan covering decentralized T-bill savings for South African Stokvels, architectural diagrams, compliance rules, mocked vs real infrastructure matrix, and low-data accessibility.
* **Changes:**
  - Updated [README.md](../README.md) with full 16-part specification.
  - Linked to verified Testnet accounts in `docs/ACCOUNTS.md`.
  - Added Mermaid architecture diagram and lifecycle workflow.
  - Declared mocked layers and indicative yield status conforming to G6.

### [2026-11-10] README v0 Scope and Guardrail Review
* **Prompt / Task:** Review the repository foundation against issue S-01 and its README and secret-handling requirements.
* **Changes:**
  - Reworked [README.md](../README.md) as a concise v0 with a Mermaid architecture diagram, explicit verification placeholders, and teammate setup checkboxes.
  - Removed unverified demo, deployment, partner, rate, and regulatory claims from the README.
  - Replaced secret-shaped example values in `.env.example` with empty values and clarified local-only secret handling.
  - Added shared ESLint configuration and made the web lint command usable before the app scaffold exists.

### [2026-11-10] Testnet Bootstrap (S-02)
* **Prompt / Task:** Implement the testnet-only Stellar account, mock-asset, and hello-contract bootstrap workflow.
* **Changes:**
  - Added an explicit testnet/passphrase guard, exact Soroban SDK and Stellar JS SDK pins, and a `pnpm chain:bootstrap` command.
  - Added local key generation, Friendbot funding, idempotent trustlines and MOCK asset balances, deterministic contract deployment, and hello invocation.
  - Updated account documentation to contain generated public keys only; secret keys remain in ignored `.env`.
  - Added the Soroban hello entry point and automated Node network-guard tests.
  - Added the Anchor-sim testnet account as a separate simulated role.

### [2026-11-12] Web App Scaffold (S-03)
* **Prompt / Task:** Implement the S-03 web app scaffold with design tokens, i18n scaffolding, PWA support, and security considerations.
* **Changes:**
  - Added a responsive Next.js App Router shell with English/isiZulu text switching, Tailwind configuration, and repository formatting commands.
  - Added a web manifest, original SVG app icon, and a service worker limited to same-origin page navigation with an offline fallback; API and account data are not cached.
  - Added Stellar Wallets Kit 2.8.0 (MIT), lazy-loaded only for the optional Freighter/Varial connection, explicitly set to Testnet and limited to address display.
  - Documented deployment, I-01 login, wallet-kit licensing, and device-verification status without claiming unverified results.

### [2026-11-12] ZATBILL Compliance Asset (T-01)
* **Prompt / Task:** Implement the Testnet-only ZATBILL classic asset, issuer controls, SAC integration, transparent metadata, and verification commands.
* **Changes:**
  - Added a dedicated issuer role and set `AUTH_REQUIRED`, `AUTH_REVOCABLE`, `AUTH_CLAWBACK_ENABLED`, and the Testnet home domain before creating ZATBILL trustlines; left `AUTH_IMMUTABLE` disabled.
  - Added an authorized dealer trustline, issuer-only initial dealer issuance, deterministic SAC deployment, and pot-contract SAC authorization.
  - Added authorize, freeze, clawback, and end-to-end Testnet verification commands with Testnet Horizon transaction links.
  - Added a CORS-enabled SEP-1 `stellar.toml`, a transparency disclosure explicitly marked not an attestation, `docs/ASSET.md`, and a localized home-page link.
  - Verified implementation details against official Stellar asset flags, clawback, SAC, issue-asset, SEP-1, and CLI documentation. No live Testnet deployment was run because no local `.env` or public home domain was configured.

### [2026-11-13] MOCK mZAR and Testnet Faucet (B-02)
* **Prompt / Task:** Issue a mock rand asset, wrap it in a Stellar Asset Contract, provide a rate-limited demo faucet, format mZAR as rand in the UI, and research Mainnet ZAR/ZARP assets without using them in the demo.
* **Changes:**
  - Added a Testnet-guarded mZAR setup script using the separate Anchor-sim issuer; it sets the issuer home domain, deploys the SAC, and records the SAC address.
  - Added an API faucet that checks recipient trustlines and limits each account to 100 mZAR per 24 hours; the in-memory cooldown is explicitly scoped to a single process.
  - Added rand currency formatting, an mZAR disclosure page, and MOCK mZAR metadata in the Testnet stellar.toml.
  - Recorded Mainnet Horizon ZAR/ZARP asset-code observations and verification limits in [B-02.md](./B-02.md); the project does not use any Mainnet issuer.

### [2026-11-13] Risk Explainer and Accessibility (D-02)
* **Prompt / Task:** Add the D-02 design-system primitives, asset-flow narrative, plain-language risk explainer, and WCAG 2.2 AA checks.
* **Changes:**
  - Added reusable button, card, stepper, toast, transaction status, empty, loading, and error components; added the illustrative rand-to-T-Bill-to-pot-share flow and four explicit risk statements.
  - Raised text and touch-target sizes, added visible keyboard focus, and retained text labels for simulated/not-connected statuses. The static shell uses local assets and supports low-data use without remote imagery or fonts.
  - Ran axe-core 4.14 at 360×800 on six English/isiZulu routes: zero WCAG 2.0/2.1/2.2 A/AA violations. Keyboard focus/order and 360px overflow were checked in-browser.
  - isiZulu fluent-speaker review, manual screen-reader testing, and non-technical comprehension testing remain pending; these are not claimed complete.
