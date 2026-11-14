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

### [2026-11-13] Simulated KYC and Trustline Allowlist (T-03)
* **Prompt / Task:** Implement Issue T-03: Simulated KYC and trustline allowlist (#7) with synthetic SA ID Luhn algorithm check, phone OTP, POPIA user consent, automated sponsor provisioning and issuer trustline authorization, admin revocation, docs/KYC.md brief, and UI error handling for unauthorized accounts.
* **Changes:**
  - Added `services/api/src/kyc.ts` with synthetic 13-digit South African ID validation (Luhn checksum algorithm, DOB, citizenship), phone format and 6-digit OTP validation, and POPIA consent verification.
  - Implemented `KycStore` and `KycService` with zero-PII logging/storage: only account public key and timestamps are recorded; sensitive fields are strictly redacted in server logs (G1 & G7).
  - Implemented automated sponsor account provisioning (2.5 XLM reserve) and issuer trustline authorization (`setTrustLineFlags({ authorized: true })`).
  - Added administrative revocation (`POST /kyc/revoke` and `pnpm chain:zatbill revoke <account>`), which executes `flags: { authorized: false }` to freeze transfers.
  - Added `POST /zatbill/claim` demo distribution endpoint from Dealer to demonstrate that unverified or frozen accounts are rejected on-chain with `op_not_authorized`.
  - Added CLI commands in `scripts/zatbill.ts`: `allowlist`, `revoke`, `transfer`, and end-to-end `kyc-demo`. Verified live on Stellar Testnet.
  - Added `docs/KYC.md` detailing the simulation vs. production FICA compliance (DHA HANIS/ABIS database verification, biometric liveness, sanctions/PEP screening, goAML reporting, and POPIA data minimization).
  - Built interactive `KycAllowlist` UI component in `apps/web/app/components/kyc-allowlist.tsx` integrated into the Advanced Wallet page with full English and isiZulu localization, handling the safe `op_not_authorized` failure state and simulated admin freeze.
  - Added 12 unit tests in `services/api/src/kyc.test.ts` and `scripts/zatbill.test.ts`. All 29 workspace tests pass cleanly.

### [2026-11-13] StokvelPot Soroban Smart Contract (T-04)
* **Prompt / Task:** Implement Issue T-04: StokvelPot Soroban contract (#8) with explicit 4-state lifecycle (Open, Invested, Matured, Settled), membership control, mZAR contributions, atomic ZATBILL investment with backing verification, post-maturity settlement, pro-rata claims with rounding protection, emergency pause, storage TTL management, comprehensive cargo tests with 5 members and all reverts, live Testnet deployment recorded in docs/DEPLOYMENTS.md, and plain-language rules in docs/POT_RULES.md.
* **Changes:**
  - Implemented `StokvelPotContract` in `contracts/stokvel-pot/src/lib.rs` with `PotState` enum (`Open`, `Invested`, `Matured`, `Settled`), strict typed `Error` enum (`NotMember`, `OverCap`, `Paused`, `WrongState`, `ZeroAmount`, `NotMatured`, `AlreadyClaimed`, `ZeroBalance`, `InsufficientBacking`, `AlreadyMember`, `NotAdmin`, `NotDealer`), and storage TTL extensions (`17280` ledgers threshold, `518400` ledgers bump).
  - Enforced guardrail against unbounded loops: all contribution, investment, settlement, and claim calls operate in O(1) constant time with zero iteration over member lists.
  - Implemented mathematical backing verification: Dealer must deliver at least 1 ZATBILL per 1 mZAR invested (`zatbill_amount >= total_mzar`), guaranteeing full collateral backing and non-negative yield at maturity.
  - Implemented integer division floor rounding rule for pro-rata payouts, leaving residual dust in the pot to protect against contract insolvency.
  - Added comprehensive `contracts/stokvel-pot/src/test.rs` suite with 12 tests covering the full 5-member lifecycle, cap enforcement, pause controls, backing checks, premature claims, and double-claim reverts. All tests pass (`cargo test`).
  - Compiled contract with `stellar contract build` and deployed live to Stellar Testnet with contract ID `CCCC3ERGNWEICYH377ABAHKGTHA2T5YD7K7ETCHGESQ3I7RSUSAFXQNB`.
  - Created `docs/DEPLOYMENTS.md` recording contract addresses, deployment timestamps, and CLI verification commands.
  - Created `docs/POT_RULES.md` documenting the 4 lifecycle states, plain-language UI copy rules, rounding rule, DoS safety guarantees, and the Classic multisig fallback plan. Updated `README.md` and `docs/ACCOUNTS.md`.

### [2026-11-13] Mock Primary Dealer and Maturity Engine (T-05)
* **Prompt / Task:** Implement Issue T-05: Mock primary dealer and maturity engine (#9) with dealer discount pricing module, time-compressed demo bill (120s term) labeled "time compressed for demo", annualized indicative yield helper, CLI automation scripts (`pnpm demo:invest` and `pnpm demo:mature`), cent-precision rounding tests, documentation of pricing formulas in `docs/ASSET.md`, and complete verified on-chain lifecycle execution on Stellar Testnet.
* **Changes:**
  - Implemented `@stockonchain/chain/dealer` (`packages/chain/src/dealer.ts`) with South African Money Market actual/365 discount pricing formula $P = F \times (1 - \frac{d \times t}{365})$ and annualized yield formula $\text{Yield} = \frac{F - P}{P} \times \frac{365}{t}$.
  - Added product configurations: standard 91-day product ($t = 91$ days, 8.25% p.a.) and time-compressed demo bill ($t = 91$ financial equivalence, 120 seconds ledger term, 10.0% p.a.) labeled `time compressed for demo`.
  - Added primary dealer quote generator `quotePrimaryDealer` enforcing non-guaranteed demo rate disclaimers (G4 & G6).
  - Added `reconcileMemberPayouts` function enforcing cent-precision integer division invariants: $\sum \text{payouts} + \text{potRemainder} \equiv \text{Settlement Total}$ down to the exact stroop and cent.
  - Added 7 unit tests in `packages/chain/src/dealer.test.ts` testing pricing formulas, yield checks, time-compressed configs, disclaimers, and 5-member/odd-share cent reconciliation. All 36 monorepo tests pass cleanly.
  - Implemented Soroban multi-party auth client `scripts/soroban-client.ts` supporting dual-party authorization (`admin` + `dealer`) with automated retry on transient network resets.
  - Created CLI automation scripts `scripts/demo-invest.ts` (`pnpm demo:invest`) and `scripts/demo-mature.ts` (`pnpm demo:mature`).
  - Executed complete end-to-end lifecycle on Stellar Testnet for contract `CD3KZIPIZLF2G4D66IJ4NP5MKL22DX4VKLZ4TH7WY7IIM43SKA7E5UCX`:
    - Initialization: [Tx 24f6cb37...](https://horizon-testnet.stellar.org/transactions/24f6cb37f690917d8e30164880e95fce16665db1c8f73ea79e60722aa3a8989e)
    - SAC Authorization: [Tx 61c9d972...](https://horizon-testnet.stellar.org/transactions/61c9d97209d1031aef36bf3e1994751c05def9e041464c2070f177069f984288)
    - Allowlist Additions: [Tx 2139e730...](https://horizon-testnet.stellar.org/transactions/2139e7303d556af1ebe4260964806bcd6cdb8baf43b786e5ae2ee32732bee394), [Tx 99187be6...](https://horizon-testnet.stellar.org/transactions/99187be66b8f5d7c501bedc1a3778c4805d34cc83f2b5e4ecedf560803febfbf), [Tx b584cabb...](https://horizon-testnet.stellar.org/transactions/b584cabb025dbf887a1853c4c262cc6caf72ed64b3e967bf2f5c992be6c08ff4)
    - Contributions (R100 total): [Tx 264bdbcb...](https://horizon-testnet.stellar.org/transactions/264bdbcb1cf54eb5ab50cc5ae5bad54fcea713853b27b81eaeb8d6e42fbac2e1), [Tx 3d2dcae6...](https://horizon-testnet.stellar.org/transactions/3d2dcae6113b39bb26dfc992b401353254c54766f79d9b77520e807dfedced67), [Tx 8ad7ba03...](https://horizon-testnet.stellar.org/transactions/8ad7ba03a6e6bda9bb325cd71358f27ab11662b8f87330d5461efc3191070110)
    - Dual-Auth Investment Swap: [Tx 49e811b0...](https://horizon-testnet.stellar.org/transactions/49e811b036e931bff2f63bd7fc7e8f18e63109e7c777c22360ee80b3ec3e8a20)
    - Full Face-Value Settlement: [Tx 9e114ce1...](https://horizon-testnet.stellar.org/transactions/9e114ce12eb846c79e615531cbfe389e3b81a773477891926e9e0d66e47566b4)
    - Pro-Rata Member Claims: [Tx f9fbc127...](https://horizon-testnet.stellar.org/transactions/f9fbc12783e6426219fc26a392c28a1e8f07b34af67f9c2c51f129f53e1c48b8), [Tx 8b039b90...](https://horizon-testnet.stellar.org/transactions/8b039b906472eafa85f3707f90bfd5b3940e0f673ce077335ed01185872c5d67), [Tx 99498f5e...](https://horizon-testnet.stellar.org/transactions/99498f5e16298807674376368dc4ffa3af101eec22634d4a7ba2c660bbef6599)
    - Strict cent-level reconciliation verified: Total pooled R 100.00, settlement payout R 102.00, claims R 102.00, dust 0 stroops.
  - Documented exact pricing formulas, Actual/365 conventions, non-guaranteed simulated rate disclosures, and testnet verification results in `docs/ASSET.md` and `docs/DEPLOYMENTS.md`.

### [2026-11-13] Proof of Backing: Signed Attestation and On-Chain Anchor (T-06)
* **Prompt / Task:** Implement Issue T-06: Proof of backing: signed attestation and onchain anchor (#10) with mock custodian `/attestation.json` endpoint, mock custody statement PDF generation & SHA-256 verification, on-chain `manage_data` anchoring on the ZATBILL issuer account, SEP-0001 `stellar.toml` reserve linking, live circulating supply calculation vs. attested reserves, backing ratio verification endpoint `/api/backing`, and demo deficit mode toggle (`?demo_deficit=true`).
* **Changes:**
  - Implemented `@stockonchain/chain/attestation` (`packages/chain/src/attestation.ts`) with mock custodian metadata (`Mock Custodian Services (Pty) Ltd`), deterministic canonical JSON serialization, and Ed25519 signing & verification.
  - Implemented standard PDF-1.4 binary buffer generator `generateMockCustodyStatementPdf` with visible mock disclosures and SHA-256 computation (`computeSha256`).
  - Anchored the PDF SHA-256 digest (`51d99c1974d37cc73dcd74da18e2c46a5c7341f86a14fd3a847809c75caa0c64`) directly onto the ZATBILL issuer account via Stellar `manage_data` (`zatbill_attestation_hash`) on Testnet: [Tx d54605a3...](https://horizon-testnet.stellar.org/transactions/d54605a38a0286e27c3bc397ff2780f1e5a22b656198d4e84626fe6510e21750).
  - Created live `/attestation.json` and updated `/assets/zatbill-attestation.json` endpoints serving the cryptographically signed attestation payload with CORS headers.
  - Saved mock custody statement PDF at `apps/web/public/assets/mock-custody-statement.pdf` and updated `stellar.toml` to cross-link the attestation via SEP-0001 `attestation_of_reserve = "https://${homeDomain}/attestation.json"`.
  - Implemented `/api/backing` (and `/api/zatbill/backing`) returning live backing ratio, circulating supply, signature validation, PDF hash verification, and on-chain anchor matching, supporting `?demo_deficit=true` toggle for UI warning states.
  - Created CLI automation tools: `pnpm chain:attestation:anchor` (`scripts/anchor-attestation.ts`) and `pnpm chain:attestation:verify` (`scripts/verify-backing.ts`).
  - Added unit test suites `packages/chain/src/attestation.test.ts` (6 tests) and `apps/web/app/api/backing/route.test.ts` (2 tests) covering all tamper modes (signature corruption, payload alteration, PDF single-byte modification, and demo deficit toggle).
  - Documented full proof of backing architecture, formulas, and testnet transaction links in `docs/ASSET.md` and `docs/DEPLOYMENTS.md`.

### [2026-11-13] Onchain Reserve Check: ProofOfBacking (T-07)
* **Prompt / Task:** Implement Issue T-07: Onchain reserve check (ProofOfBacking) #11 with Soroban contract function verifying the custodian's Ed25519 signature over the attestation payload, storing the latest attested reserve on-chain, and enforcing a validation check in `invest` so that purchases of ZATBILL cannot exceed the currently stored attested reserve limit, with comprehensive unit test coverage and fallback architecture documentation.
* **Changes:**
  - Added on-chain Proof of Backing storage keys (`CustodianPubkey`, `AttestedReserves`, `AttestationTimestamp`) and errors (`ExceedsAttestedReserves = 18`, `InvalidTimestamp = 19`) in `contracts/stokvel-pot/src/lib.rs`.
  - Implemented `update_attested_reserves`, `set_custodian_pubkey`, `get_custodian_pubkey`, `get_attested_reserves`, and `get_attestation_timestamp` in `StokvelPotContract`, verifying Ed25519 signatures via `env.crypto().ed25519_verify()` over a 41-byte canonical binary payload (`ZATBILL_RESERVES:` + 16 bytes `i128` + 8 bytes `u64`).
  - Added enforcement check in `invest`: purchases of `ZATBILL` exceeding `get_attested_reserves()` immediately revert with `Error::ExceedsAttestedReserves`.
  - Added 7 Soroban unit tests in `contracts/stokvel-pot/src/test.rs` covering happy path signature verification, forged signature rejection, tampered reserves amount rejection, investment exceeding attested reserve revert, exact-boundary investment success, unauthorized custodian pubkey rejection, and outdated timestamp replay rejection (all 19 contract tests pass).
  - Added on-chain signing and verification helpers `buildOnchainAttestationMessage`, `signOnchainAttestation`, and `verifyOnchainAttestationSignature` in `@stockonchain/chain` (`packages/chain/src/attestation.ts`) with unit tests (all 46 workspace tests pass).
  - Compiled and deployed updated Soroban contract to Stellar Testnet with contract ID `CBIZM7UPAA7OCRRHSEL43MMDZIKNYQEMB5LB7HZQ32KMV44V6ZW456XM` (version `0.3.0-stokvel-pot`), verified on-chain signature verification and reserve storage via `scripts/post-attestation.ts`, and verified on-chain forged signature rejection.
  - Updated `README.md`, `docs/DEPLOYMENTS.md`, and `docs/POT_RULES.md` documenting the on-chain architecture and backend API fallback plan.



### [2026-11-13] D-01 Research Plan
* **Prompt / Task:** Structure the D-01 personas, journeys, interview plan, process map, wireframe flows, glossary, pitch, and contribution clock.
* **Changes:**
  - Added `docs/RESEARCH.md` with explicitly synthetic personas and unverified process hypotheses, a consent script, privacy constraints, interview questions, six lo-fi text flows, glossary, and clock definition.
  - Updated the README with a draft pitch and a link to the research plan.
  - No interviews, Figma file, participant findings, comprehension tests, or interview-traced design changes were fabricated; all remain visibly pending.

### [2026-11-14] Onboarding and Verification Flow (A-01)
* **Prompt / Task:** Implement Issue A-01: Frictionless sign-up and simulated KYC verification flow in 3 screens or fewer with elapsed-time tracking, plain-language "Not verified yet" state handling, zero crypto jargon, POPIA consent, and 3-browser E2E verification.
* **Changes:**
  - Added landing-page sample contact sign-up (`apps/web/public/index.html`, `apps/web/public/zu.html`, `apps/web/app/components/home-shell.tsx`) and `/onboarding` wizard (`apps/web/app/onboarding/page.tsx`, `apps/web/app/components/onboarding-wizard.tsx`) with English and isiZulu localization.
  - Implemented 3-screen onboarding progress indicator, synthetic-only email/phone contact selection, 13-digit synthetic SA ID and 6-digit OTP checks, mandatory POPIA privacy consent, plain-language `"Not verified yet"` result state, and zero-PII interaction time recording in `sessionStorage`.
  - Removed user-facing crypto jargon (`trustline`, `seed phrase`, `gas fee`) from web UI copy (`apps/web/app/components/kyc-allowlist.tsx`, `apps/web/app/assets/page.tsx`, `apps/web/app/assets/mzar/page.tsx`).
  - Added Playwright E2E test suite (`apps/web/e2e/onboarding.spec.ts`, `apps/web/playwright.config.ts`) and CI step verifying the onboarding and verification flow across Chrome, Edge, and Firefox.

### [2026-11-14] Stokvel Pot Dashboard (A-02)
* **Prompt / Task:** Implement Issue A-02: Pot dashboard with Pot Summary & Progress (South African Rand total balance, member lists, real-time contribution progress tracking), Asset Visual Representation (exact ZATBILL amount, maturity countdown, indicative yield label), Event-Driven Activity Feed with empty and loading states, `/packages/chain` hooks operating in both mock mode and live testnet environments, and LCP verified under 2.5s on a throttled 4G mobile connection.
* **Changes:**
  - Added `@stockonchain/chain/pot-dashboard` (`packages/chain/src/pot-dashboard.ts` and `packages/chain/src/index.ts`) exporting view models (`PotDashboardData`, `PotMemberRecord`, `PotHoldingsView`, `PotActivityEvent`, `MaturityCountdownView`), `formatRandAmount`, `formatMaturityCountdown`, `getMockPotDashboardData`, `fetchLiveTestnetPotDashboardData`, and the `usePotDashboard` hook operating in both `"mock"` and `"testnet"` modes (G2).
  - Built `PotDashboard` (`apps/web/app/components/pot-dashboard.tsx`) and routes `/pot` (`apps/web/app/pot/page.tsx`) and `/dashboard` (`apps/web/app/dashboard/page.tsx`) with English and isiZulu localization, strict `en-ZA` Rand (`ZAR`) formatting via `formatMzarAsRand`, and prominent Mock Mode / Testnet demo badges (G6 & G9).
  - Added unit tests in `packages/chain/src/pot-dashboard.test.ts` and 3-browser Playwright E2E tests in `apps/web/e2e/pot-dashboard.spec.ts` verifying `< 2.5s` LCP under throttled 4G mobile network conditions.


### [2026-11-14] Create and Join a Pot (A-03)
* **Prompt / Task:** Implement Issue A-03: Create and join a pot with Pot Creation Wizard (91, 182, or 364 days alongside the 120s demo bill option, monthly contribution amounts, per-member caps, member lists, and automatic assignment of the creator to the Treasurer role), Sharing & Invites (direct invitation links and WhatsApp messaging integration), and Join Flow & Transparency (dedicated join screen summarizing pool rules anchored in `docs/POT_RULES.md`, D-01 plain-language glossary per G4, mandatory `RiskExplainer` review, and non-technical rule comprehension verification).
* **Changes:**
  - Extended `@stockonchain/chain/dealer` (`packages/chain/src/dealer.ts`) with `standard182Day` (182 days) and `standard364Day` (364 days) Treasury Bill benchmark products alongside `standard91Day` (91 days) and `demoTimeCompressed` (120s demo bill).
  - Added `@stockonchain/chain/pot-create-join` (`packages/chain/src/pot-create-join.ts`) exporting `POT_TERM_OPTIONS`, `D01_GLOSSARY` (strictly adhering to `docs/RESEARCH.md` per G4), `POT_RULES_ANCHORED_SUMMARY` (anchored in `docs/POT_RULES.md`), `createStokvelPot`, `generatePotInvite`, `parsePotInviteToken`, `COMPREHENSION_QUESTIONS`, `evaluateRuleComprehension`, and `joinStokvelPot`.
  - Built multi-step `PotCreateWizard` (`apps/web/app/components/pot-create-wizard.tsx`, `/pot/create`) and `PotJoinFlow` (`apps/web/app/components/pot-join-flow.tsx`, `/pot/join`) with English and isiZulu localization, localized Rand formatting (`en-ZA` `ZAR`), direct invitation links, WhatsApp share links (`https://wa.me/?text=...`) + sandbox preview, mandatory `RiskExplainer` review gate, and 3-question non-technical rule comprehension verification.
  - Added unit tests in `packages/chain/src/pot-create-join.test.ts` and 3-browser Playwright E2E tests in `apps/web/e2e/pot-create-join.spec.ts`.
