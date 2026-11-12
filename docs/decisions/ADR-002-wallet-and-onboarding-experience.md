# ADR-002: Wallet and onboarding experience

- Status: Accepted
- Date: 2026-11-12

## Plain-Language Explanation

This ADR decides how the product handles wallet creation, access, and onboarding for the demo. The chosen approach is the fastest route to the under-two-minute demo flow while keeping the product honest about custody risk.

The decision is not just about technical convenience. It is also about product behavior: users should be able to start in a few steps, but the system must make it clear that it is a demo wallet experience with explicit custody risk and sponsor coverage.

## Option Paths

### Option A: Freighter-only wallet flow

Require the user to bring an existing Stellar wallet such as Freighter and handle the account directly from the wallet.

Pros:
- Best alignment with the native Stellar wallet model.
- No app-side custody of private keys.
- More trustworthy for a user familiar with Stellar wallets.

Cons:
- Slower and harder onboarding for non-technical users.
- Does not remove the need to sponsor the user’s account and base reserve for first-time onboarding.
- Too heavy for the under-two-minute demo benchmark.

### Option B: Passkey smart wallet

Use a passkey-based wallet abstraction to hide raw seed phrases from the user.

Pros:
- Strong UX for first-time users.
- Lower friction than a raw keypair flow.
- Good long-term roadmap story.

Cons:
- Requires extra design and infrastructure work.
- Adds recovery and authorization complexity.
- Not the fastest path to the current demo milestone.

### Option C: Custodial-lite flow (recommended)

Use a custodial-lite wallet flow where the app manages the user wallet and hides the seed and transaction steps behind a simple onboarding experience.

Pros:
- Fastest route to the under-two-minute rubric item.
- Gives a seamless demo experience for first-time users.
- Fee-bump transactions can cover network fees for user-signed Stellar account transactions, while sponsored reserves can cover the account's base reserves and trustlines.

Cons:
- Puts real custody risk on the service operator.
- Requires honest disclosure that the system is not a self-custody product.
- Must be treated as a demo workflow rather than a bank-grade wallet.
- Soroban transaction resource fees and contract storage rent are not covered by sponsored reserves; fee-bumps alone are not a universal fee-sponsorship solution for contract accounts.

## Recommendation

Adopt the custodial-lite flow as the default onboarding method for the demo.

The product should hide wallet complexity from the user, but it must be explicit that the app is operating a custodial-lite wallet with the associated risk. For Stellar G-account onboarding, pair sponsored reserves for account creation and trustlines with fee-bump transactions for network fees. These are distinct protocol features: reserve sponsorship covers minimum-balance obligations, while a fee-bump fee account pays the transaction fee for an already-signed inner transaction.

Do not claim these mechanisms alone provide a zero-XLM experience for every Soroban call. If Soroban calls must also be sponsored, choose and verify an appropriate relayer or transaction-source design for Soroban resource fees and storage rent. Passkey wallets remain a roadmap item, and Varial (formerly Freighter) stays as the advanced connection path.

## Decision

The project will implement:

- A custodial-lite wallet onboarding flow that is fast enough for the demo rubric.
- Sponsored reserves for account-creation and trustline minimum balances, plus fee-bump transactions for network fees on applicable G-account transactions.
- A separate verified relayer or sponsor-source approach for Soroban resource fees and storage rent before claiming that Soroban actions require no user-held XLM.
- Explicit disclosure that the wallet is custodial-lite and carries operator custody risk.
- A roadmap path for passkey wallet support and a separate advanced integration path via Varial.

This is the best balance of speed, product clarity, and demo reliability, and it is intentionally more honest than claiming a fully self-custody or regulated wallet experience.

## Sources

- Account creation, base reserves, and trustlines: https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts
- Transaction fundamentals and fee-bump behavior: https://developers.stellar.org/docs/learn/fundamentals/transactions/operations-and-transactions
- Fee-bump transactions: https://developers.stellar.org/docs/build/guides/transactions/fee-bump-transactions
- Sponsored reserves: https://developers.stellar.org/docs/build/guides/transactions/sponsored-reserves
- Choosing a fee-sponsorship approach, including relayers: https://developers.stellar.org/docs/build/guides/transactions/fee-sponsorship
- Wallet key-management considerations: https://developers.stellar.org/docs/build/apps/application-design-considerations
- Varial wallet integration: https://developers.stellar.org/docs/build/guides/freighter
