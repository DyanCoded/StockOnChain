## Description
<!-- Provide a concise explanation of the changes made and the motivation. -->

Closes #<!-- Link issue number here -->

---

## AI Usage Disclosure
<!-- As required by AI_GUIDELINES.md (G10 Transparency). -->
- **AI Tool Used:** [ ] None / [ ] Gemini / [ ] Claude / [ ] ChatGPT / [ ] Other
- **Scope of AI Assistance:** <!-- Describe what parts were assisted by AI, if any -->
- **AI Prompt Log Entry Added:** [ ] Yes (`docs/AI_LOG.md` updated) / [ ] N/A

---

## Baseline Definition of Done (DoD)
Please ensure all items are checked before requesting review:

### Code Quality & Compilation
- [ ] Code compiles without errors or warnings.
- [ ] Soroban contract compiles via `stellar contract build`.
- [ ] Rust unit tests pass via `cargo test`.
- [ ] Formatted with `cargo fmt --check`.
- [ ] Clippy checks pass without warnings (`cargo clippy -- -D warnings`).
- [ ] Frontend / Node packages lint cleanly (`pnpm lint`).

### Guardrails & Security Compliance
- [ ] **G1 (No Secrets):** No Stellar secret keys (`S...`), private keys, or `.env` files are committed.
- [ ] **G2 (Human-in-the-loop):** Author has reviewed and understood all code changes.
- [ ] **G3 (Chain Code):** Storage TTLs are explicitly managed; no unbounded storage or loops.
- [ ] **G5 (Testnet Only):** All network configurations target Stellar Testnet only.
- [ ] **G6 (Honesty):** Any mocked or simulated components are clearly declared.
- [ ] **Documentation:** README / docs updated if architecture or configuration changed.

