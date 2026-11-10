# Contributing to StockOnChain

Thank you for contributing to StockOnChain! We are building transparent, decentralized Treasury-bill savings pots for South African stokvels on Stellar and Soroban.

---

## 1. Code of Conduct & AI Guardrails

All contributions must strictly follow our engineering guidelines defined in [AI_GUIDELINES.md](./AI_GUIDELINES.md):

* **G1 (No secrets):** Never commit private keys (starting with `S`), `.env` files, or API credentials.
* **G2 (Human in the loop):** Review and understand every line of code.
* **G3 (Chain code):** All Rust and Soroban code must be compiled and tested with unit tests before opening a PR. Ensure explicit storage TTL management.
* **G4 (Verify):** Verify all external dependencies, network URLs, and figures against authoritative sources.
* **G5 (Testnet only):** Testnet only. No mainnet configurations.
* **G6 (Honesty):** Clearly identify simulated or mocked layers.
* **G10 (Transparency):** Log notable AI assistance and architectural prompts in [docs/AI_LOG.md](./docs/AI_LOG.md).

---

## 2. Development Setup

### Prerequisites
* **Node.js**: v20 LTS
* **pnpm**: v9+
* **Rust**: 1.84+ (or stable 1.99+) with target `wasm32v1-none`
* **Stellar CLI**: 30.0.1+

```powershell
# Clone the repository
git clone https://github.com/DyanCoded/StockOnChain.git
cd StockOnChain

# Copy environment template (do not commit .env)
Copy-Item .env.example .env

# Install pnpm workspace dependencies
pnpm install

# Build Soroban smart contracts
stellar contract build

# Run Rust unit tests
cargo test
```

---

## 3. Branching & Commit Workflow

1. Create a feature branch from `main`:
   ```sh
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
2. Keep commits atomic and use descriptive messages (e.g., `feat(contract): implement pot deposit limit`).
3. Ensure CI checks pass locally prior to pushing:
   - `cargo fmt --check`
   - `cargo clippy -- -D warnings`
   - `cargo test`
   - `pnpm lint`

---

## 4. Submitting a Pull Request

* Open a PR targeting `main`.
* Complete the Pull Request template checklist, including the Definition of Done (DoD) and the AI Usage disclosure section.
* Ensure all continuous integration checks pass.
* At least one approving review is required before merging.

