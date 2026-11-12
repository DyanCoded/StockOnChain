# StockOnChain

> A Stellar and Soroban prototype exploring clearer, rules-based savings pots for South African stokvels.

## 1. Project

- **Problem:** Shared savings groups need clear records of contributions, balances, and payout rules. StockOnChain explores how software can help make those records easier for members to inspect.
- **Track / focus:** Stellar and Soroban; financial inclusion and tokenization. Confirm the official event track before describing this as an official track entry.
- **Team:** Ntsika and Kea.
- **Owner split:** Kea = product, UX, frontend, market and pitch; Ntsika = Stellar assets, Soroban contract, backend, integrations and deployment. Every issue is reviewed by the other person.
- **Status:** Work in progress. This repository does not claim a production service, live deployment, financial licence, partnership, or real-world backing.

## 2. Scope

The workspace contains a web app, an API service, a Stellar/Soroban client package, and a Soroban contract. Their end-to-end integration is not asserted here.

## 3. Architecture

The diagram shows the intended prototype flow. Integration and deployment status must be verified before describing any component as live.

```mermaid
flowchart LR
    M[Stokvel member] --> W[Web app]
    W --> A[API service]
    W --> C[Chain client]
    A -. "mock / verify" .-> K[Identity and payment services]
    C --> S[Soroban pot contract]
    S --> T[Stellar network]
    S -. "mock / verify" .-> R[Custody and payout records]
```

## 4. Repository layout and team setup

```text
apps/web/                 Web application
contracts/stokvel-pot/    Soroban contract
docs/                     Project documentation
packages/chain/           Stellar/Soroban client package
scripts/                  Project scripts
services/api/             API service
```

Setup checklist — replace the placeholders with the teammates' names and have each person check off their own setup:

- [x] **Ntsika:** cloned the repository and completed the quickstart below.
- [x] **Kea:** confirmed setup completion.

## 5. Architecture Decisions

The project records architecture decisions in the decision log and keeps them aligned with the Educate & Recommend quality standard.

- [ADR-001 — Stellar core approach and contract architecture](./docs/decisions/ADR-001-stellar-core-and-contract-architecture.md)
- [ADR-002 — Wallet and onboarding experience](./docs/decisions/ADR-002-wallet-and-onboarding-experience.md)
- [ADR-003 — Asset and backing design](./docs/decisions/ADR-003-asset-and-backing-design.md)
- [ADR-004 — Cash-out simulation and local payment rails](./docs/decisions/ADR-004-cash-out-simulation-and-local-payment-rails.md)

## 6. Mocked vs. real

This is a placeholder status matrix, not a claim that a component is deployed or backed by a real-world service. Verify each entry against the implementation and authoritative sources before changing its status.

| Component | Status | Notes |
|---|---|---|
| Web app | Local scaffold | Next.js shell is implemented; no live deployment or real-device install has been verified. See [apps/web/README.md](./apps/web/README.md). |
| API and chain client | To verify | Source folders exist; integration status is not asserted here. |
| Soroban pot contract | To verify | Contract source is in `contracts/stokvel-pot`; deployment status is unverified. |
| MOCK ZATBILL | Testnet demo token | No real T-bills, reserves, securities, yield, or payout are represented. See [docs/ASSET.md](./docs/ASSET.md). |
| Stellar network | To verify | Confirm the configured network and passphrase before use. |
| Identity checks, fiat rails, custody, and payouts | To verify / mock | Do not imply a real provider, licence, reserve, or payout without evidence. |
| Yield or investment returns | Not asserted | No rate or return claim is made in this README. |

## 7. Quickstart

Prerequisites (install once per machine): Node.js 20 or newer, pnpm 9.15.9, Rust 1.84 or newer with the `wasm32v1-none` target, and Stellar CLI for contract builds. The quickstart command installs Node dependencies and bootstraps Stellar Testnet. Never commit `.env` or put secret keys, API keys, or wallet encryption keys into an AI tool.

```powershell
git clone https://github.com/DyanCoded/StockOnChain.git
Set-Location StockOnChain
Copy-Item .env.example .env
pnpm quickstart

# Optional local validation
pnpm lint
pnpm test
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
```

`pnpm quickstart` installs dependencies from the lockfile and runs the
testnet-only `pnpm chain:bootstrap` command. Bootstrap generates role keys in the ignored
`.env`, funds them with Friendbot as needed, creates the MOCK asset trustlines,
and deploys and invokes the contract. It updates public keys in
[docs/ACCOUNTS.md](./docs/ACCOUNTS.md); never share or commit `.env`.
To provision the separate ZATBILL Testnet demo asset, deploy the web app to its public HTTPS host, set `STELLAR_HOME_DOMAIN` in `.env` to that host (domain only), then run `pnpm chain:zatbill setup`. Use `pnpm chain:zatbill verify` to exercise authorization, freeze, and clawback. See [docs/ASSET.md](./docs/ASSET.md) for scope and limits.
`pnpm test` runs Node network-guard tests. Rust contract tests are run separately
with `cargo test --workspace`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidance and [AI_GUIDELINES.md](./AI_GUIDELINES.md) for G1–G10.

## Live URL

https://stock-on-chain-gmu2.vercel.app/