# ADR-004: Cash-out simulation and local payment rails

- Status: Accepted
- Date: 2026-11-12

## Plain-Language Explanation

This ADR decides how the product models cash-out and local payment rails in the demo. The flow should feel realistic enough to understand the experience, but it must never imply that the application is a live regulated payout provider or a real bank settlement service.

The decision is whether to use a verified SEP-24 test anchor, a local payout simulator, or combine a local simulation workflow with a protocol-aligned anchor interface. SEP-24 is a protocol specification, not itself a test-anchor service; no specific SDF-hosted test-anchor endpoint or support for mZAR is assumed here.

## Option Paths

### Option 1: Use an SDF SEP-24 test anchor

Use a specific SDF or ecosystem test anchor only after verifying its endpoint, its SEP-24 support, and whether it supports the exact demo asset and network. SEP-24 recommends sandbox testing with Testnet and fake banking rails; the specification alone does not identify a service that issues mZAR.

Pros:
- Exercises an existing anchor's interactive withdrawal behavior.
- Can reveal client integration details that a local-only mock may miss.

Cons:
- Endpoint availability, SEP-24 support, and supported asset must be independently verified.
- The anchor may not accept mZAR, so it cannot be assumed to settle the demo token.
- A testnet flow with fake banking rails is not a real payout service.

### Option 2: Build a custom payout simulator

Build an internal mock API for withdrawal initiation, status, and completion, with simulated instant-bank and mobile-wallet choices. This option does not claim SEP-24 compliance.

Pros:
- Very fast to implement.
- Entirely controlled by the app.
- Good for a repeatable demo with no real off-ramp integration.

Cons:
- Does not exercise a real SEP-24 client/anchor integration.
- A custom API can drift from SEP-24 unless it is deliberately checked against the specification.

### Option 3: Use both: local simulator and SEP-24-aligned flow (recommended)

Use a local simulator for fast, repeatable feedback with fake rails, while keeping its withdrawal interface aligned with SEP-24 so a verified test anchor or future real anchor can be integrated. Claim SEP-24 compliance only after validating the implementation against the current specification, including its authentication and required endpoints.

Pros:
- Keeps the product honest: the underlying asset is not a real payment rail.
- Provides fast local feedback while preserving a clear integration boundary for SEP-24.
- Allows later testing with a verified SEP-24 anchor that supports the exact asset.

Cons:
- Requires custom backend work and explicit protocol conformance testing.
- The team must keep the simulation clearly labelled as non-live at all times.
- A protocol-aligned simulator is not automatically a fully compliant anchor or a real payout provider.

## Recommendation

Build a local mZAR payout simulator and simulated payout UI, with the withdrawal interface kept aligned to SEP-24. Do not describe the simulator as SEP-24 compliant until it has been checked against the current specification.

The UI should present a generic “instant bank payment” as the main rail and “mobile wallet” as an alternative, both clearly labelled as simulated. Only real rail names such as PayShap should be used after documentary support is found in B-01 or B-02.

## Decision

The project will not rely on a test anchor as a payout mechanism for the demo asset unless its endpoint, SEP-24 support, network, and support for the exact asset have been independently verified.

Instead, it will build a local simulator for mZAR withdrawal flows and put a simulated payment UI on top. The interface will be kept aligned with SEP-24, without claiming full compliance until verified. The primary rail will be a generic instant bank payment with a mobile wallet alternative, both labelled as simulated. Real financial provider names will only appear once the project has a credible source confirming their use.

## Sources

- SEP-24 Hosted Deposit and Withdrawal specification: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
- Stellar's SEP-24 wallet integration guide: https://developers.stellar.org/docs/build/apps/wallet/sep24
- SEP-1 Stellar info file specification: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md
- Stellar asset fundamentals: https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets
