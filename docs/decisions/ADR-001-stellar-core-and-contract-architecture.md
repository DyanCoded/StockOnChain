# ADR-001: Stellar core approach and contract architecture

- Status: Accepted
- Date: 2026-11-12

## Plain-Language Explanation

This decision sets the base model for the demo: the asset should be visible and transferable like a standard Stellar asset, while the pot logic should be enforced inside a Soroban contract. The point is to keep the user experience familiar and the rule enforcement real.

The key decision is not whether to choose “Classic or Soroban,” but how to split responsibilities. Stellar asset control remains in the native asset model, while the finance rules — contributions, caps, maturity, claims, and membership logic — are enforced inside the Soroban pot contract so failures revert and the contract remains the source of truth.

## Option Paths

### Option A: Classic-only asset model

Use a Classic asset for the full flow and keep the pot logic off-chain or in the app layer.

Pros:
- Simple setup for a minimal asset demo.
- Familiar trustline and wallet flow.
- Fast to prototype.

Cons:
- The pot rules are not enforced by the ledger-facing contract.
- Harder to guarantee the compliance requirement that a failure reverts and the balance state stays consistent.
- Risk of app-layer logic drifting away from the real on-chain state.

### Option B: Soroban-only model

Use a Soroban contract as the only mechanism for value representation and pot rules.

Pros:
- Strong programmable logic for contributions, caps, maturity, and claims.
- Better fit for app-specific financial rules.

Cons:
- User experience is less familiar for a standard asset-backed demo.
- Less natural for wallet trustline flows and asset visibility.
- Harder to match the expected user mental model while onboarding a new member.

### Option C: Hybrid approach (recommended)

Use a standard Stellar asset for user-visible balances and trustline flows, while the Soroban pot contract enforces the operating rules of the stokvel.

Pros:
- Keeps the token experience aligned with Stellar expectations.
- Lets the contract enforce contribution limits, maturity logic, claim conditions, and member compliance.
- Makes failures revert in the contract instead of relying on app-side validation alone.
- Preserves a realistic prototype path without locking the team into a single app-layer design.

Cons:
- Requires coordination between Classic asset controls and Soroban logic.
- The contract and the asset rules must be designed together so the split stays coherent.
- Requires careful separation of concerns between the UI/API layer and the ledger-enforced logic.

## Recommendation

Adopt the hybrid approach.

The product should use a standard Stellar asset for wallet visibility and transfer handling, while the Soroban pot contract remains the enforcement point for contributions, caps, maturity, and claims. This matches the rubric requirement that compliance is enforced inside the contract and that failures revert rather than silently continue.

## Decision

We will use a hybrid architecture:

- Asset trust and transfer semantics remain in the Classic asset layer.
- The Soroban pot contract enforces pot rules, maturity, caps, claims, and membership logic.
- Asset access control is handled through Stellar asset flags, not through a legacy `ALLOW_TRUST` flow.
- The demo will keep a T-04 fallback path in case Rust contract delivery slips, but the default design remains the hybrid model.

The correct Stellar authorization flags are `AUTH_REQUIRED`, `AUTH_REVOCABLE`, `AUTH_CLAWBACK_ENABLED`, and `AUTH_IMMUTABLE`. `AUTH_CLAWBACK_ENABLED` requires revocable to be active, and `AUTH_IMMUTABLE` must be off so the demo can show freeze and clawback behavior. This was verified against the official Stellar documentation.

## Sources

- Asset access control and flags: https://developers.stellar.org/docs/tokens/control-asset-access
- Stellar asset fundamentals: https://developers.stellar.org/docs/learn/fundamentals/assets
- Clawback and trustline controls: https://developers.stellar.org/docs/build/guides/transactions/clawbacks
- Soroban overview: https://soroban.stellar.org/docs
