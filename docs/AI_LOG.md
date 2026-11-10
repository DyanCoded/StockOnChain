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
