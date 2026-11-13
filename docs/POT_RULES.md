# StokvelPot Smart Contract Rules & Plain-Language Guide

> **Prototype Notice (G6):** The StokvelPot contract is an unaudited prototype deployed on the Stellar Testnet. It carries no real-world banking license, reserve guarantee, or legal endorsement. Never use the word "audited".

This document defines the operational rules, state transitions, and safety guarantees of the **StokvelPot Soroban contract**. These explanations are structured in plain language and are reused directly for user-facing UI tooltips, modals, and flow explainers.

---

## 1. The 4 Lifecycle States

The pot advances through four explicit, sequential states:

```
    ┌──────────┐        invest()         ┌────────────┐
    │   Open   │ ──────────────────────> │  Invested  │
    └──────────┘                         └────────────┘
         │                                      │
         │ contribute()                         │ maturity timestamp
         v                                      v
    (Pools mZAR)                         ┌────────────┐
                                         │  Matured   │
                                         └────────────┘
                                                │
                                                │ settle()
                                                v
                                         ┌────────────┐
                                         │  Settled   │
                                         └────────────┘
                                                │
                                                │ claim()
                                                v
                                         (Payout mZAR)
```

### State 1: Open
- **Description:** The pot is accepting contributions from allowlisted members.
- **Allowed actions:**
  - Administrator adds verified members (`add_member`).
  - Members deposit `mZAR` up to their individual contribution cap (`contribute`).
- **UI Copy:** *"Pot is Open for contributions. Deposit your stokvel share in mZAR before the investment round closes."*

### State 2: Invested
- **Description:** Accumulated `mZAR` funds have been swapped with the authorized Dealer for discounted `ZATBILL` Treasury Bill tokens. Contributions are closed.
- **Allowed actions:**
  - Tokens remain locked in the contract accumulating yield until maturity.
- **UI Copy:** *"Funds are locked in tokenized South African Treasury Bills (ZATBILL) earning discount yield. Next step: term maturity."*

### State 3: Matured
- **Description:** The term duration (e.g., 30 days) has elapsed, and the ledger timestamp has reached or exceeded the pre-agreed maturity date.
- **Allowed actions:**
  - The pot is unlocked and ready for settlement.
- **UI Copy:** *"The investment term has ended. The pot is ready for dealer settlement at face value."*

### State 4: Settled
- **Description:** The dealer has redeemed all `ZATBILL` tokens at face value (R1.00 per unit) and paid full `mZAR` into the contract.
- **Allowed actions:**
  - Members claim their pro-rata principal plus yield (`claim`).
- **UI Copy:** *"Pot is Settled. Claim your exact share of principal plus discount yield."*

---

## 2. Plain-Language Rules (Reused for UI Copy)

### Rule 1: Membership Allowlist (`NotMember`)
- **Rule:** Only members approved by the administrator can contribute to the pot or claim returns.
- **UI Error:** *"You are not an allowlisted member of this pot. Please complete verification with your stokvel administrator."*

### Rule 2: Per-Member Contribution Cap (`OverCap`)
- **Rule:** To prevent one member from dominating the pot, total individual contributions cannot exceed the configured cap (e.g., 100.00 mZAR).
- **UI Error:** *"Contribution rejected: This deposit would exceed your maximum allowed contribution cap."*

### Rule 3: Backing Verification Limits (`InsufficientBacking`)
- **Rule:** At investment time, the Dealer must deliver at least 1 ZATBILL for every 1 mZAR invested (`zatbill_amount >= total_mzar`). This mathematical condition prevents negative yield and ensures every rand is 100% backed by tokenized treasury claims.
- **UI Error:** *"Investment rejected: Dealer collateral backing does not meet the minimum face-value requirement."*

### Rule 4: Maturity Timing (`NotMatured`)
- **Rule:** Neither settlement nor claims can occur prior to the on-chain maturity timestamp.
- **UI Error:** *"Action unavailable: This stokvel pot has not reached its maturity date yet."*

### Rule 5: Exactly-Once Payouts (`AlreadyClaimed`)
- **Rule:** Each member can claim their pro-rata return exactly once. Duplicate withdrawal attempts are immediately blocked.
- **UI Error:** *"You have already claimed your full share from this settled pot."*

### Rule 6: Pro-Rata Distribution Formula
- **Formula:**
  $$\text{Payout} = \frac{\text{Member Shares} \times \text{Settlement Total}}{\text{Total Shares}}$$
- **UI Copy:** *"Your payout is calculated proportionally based on your contribution shares relative to the entire stokvel group."*

### Rule 7: Rounding-Remainder Handling Rule
- **Rule:** Smart contracts perform integer division. Any residual fractional stroops/cents that cannot be evenly divided remain in the pot contract. This guarantees the contract never overpays and cannot become insolvent.
- **UI Copy:** *"Fractional cent rounding remainders remain safely in the pot reserve to prevent overdrafts."*

### Rule 8: Emergency Pause Mechanism (`Paused`)
- **Rule:** In the event of network anomalies or security reviews, the administrator can pause the pot, halting deposits and swaps until resolved.
- **UI Error:** *"The pot is temporarily paused by the administrator for operational maintenance."*

### Rule 9: DoS Prevention & Pull-Based Claims
- **Design:** The contract contains **absolutely no loops over member lists**. Payouts are pull-based: each member initiates their own `claim(member)` call in $O(1)$ constant time. This eliminates gas exhaustion limits and prevents malicious DoS attacks.

### Rule 10: On-Chain Proof of Backing & Reserve Limit (`ExceedsAttestedReserves`)
- **Rule (T-07):** In the `invest` function, total purchases of `ZATBILL` cannot exceed the currently stored attested reserve limit verified by the custodian's Ed25519 cryptographic signature. If the dealer delivers more `ZATBILL` than the custodian has attested, the transaction reverts immediately with `ExceedsAttestedReserves`.
- **UI Error:** *"Investment rejected: Requested ZATBILL purchase exceeds the custodian's on-chain verified backing reserve."*
- **Fallback Architecture:** If the on-chain cryptographic check is deferred or bypassed, the validation check is enforced within the backend API, and all disclosures must state this honestly in the UI and README.md.

---

## 3. Storage & Ledger TTL Management

In accordance with Soroban best practices:
- **Instance Storage:** Contract roles, configuration, and global accounting use instance storage with automated TTL extensions up to 30 days (`518,400` ledgers) on every state transition.
- **Persistent Storage:** Member shares, contributions, and claim flags use persistent storage with deliberate TTL extension on every write.

---

## 4. Fallback Plan: Classic-Only Architecture

If Soroban smart contract development, consensus upgrades, or testnet RPCs encounter unforeseen blockers, StockOnChain implements a verified fallback to Stellar Classic rails:

1. **Multisig Account:** A classic Stellar account configured with a 2-of-3 threshold among Admin, Custodian, and Dealer.
2. **Asset Trustline Controls:** The `ZATBILL` asset's native `AUTH_REQUIRED` and `AUTH_REVOCABLE` compliance flags enforce the member allowlist directly on-chain without smart contract execution.
3. **Backend API State Machine:** Pot state transitions, member share accounting, and contribution caps are coordinated and attested by the `@stockonchain/api` microservice.
4. **Transparency:** If the fallback is engaged, all state transition attestations are published as signed JSON disclosures under `/assets/pot-disclosure.json`.
