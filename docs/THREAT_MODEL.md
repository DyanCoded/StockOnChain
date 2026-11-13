# Threat Model & Security Architecture

This document provides a comprehensive security threat model for **StockOnChain**, analyzing the attack surface, trust assumptions, mitigations, and known limitations across smart contracts, classic Stellar compliance assets, cryptographic attestations, and backend infrastructure.

> [!WARNING]
> **Prototype & Testnet Notice:** StockOnChain is an unaudited prototype deployed exclusively on the Stellar Testnet. It is designed for demonstration and hackathon evaluation. It must NOT be used with real-world capital, real PII, or on the Stellar Mainnet.

---

## 1. System Overview & Trust Boundaries

```
[ Unverified User ]
       | (Submits synthetic KYC)
       v
[ API /kyc/verify ] ---> [ KycStore ] (Zero PII, SHA-256 hash only)
       | (Signs SetTrustLineFlags: AUTHORIZED)
       v
[ Stellar Testnet ] <=== [ StokvelPot Contract ] <=== [ Primary Dealer ]
       ^                           ^                           ^
       |                           | (Onchain Ed25519 Verify)  | (Dual-auth DvP)
       |                           v                           |
[ Sponsor Account ]      [ Custodian Attestation ] <----------+
```

StockOnChain spans four distinct trust boundaries:
1. **On-Chain Soroban Smart Contracts (`StokvelPot`):** Enforces state machine transitions, member contribution caps, dual-authorization investments, on-chain reserve checks, and single-claim payouts.
2. **Classic Stellar Assets (`ZATBILL`, `mZAR`):** Leverages Protocol 22 Asset Control flags (`AUTH_REQUIRED_FLAG`, `AUTH_REVOCABLE_FLAG`) to restrict token transfers to KYC-verified allowlisted wallets.
3. **Off-Chain Attestation & Dealer Services:** Generates Ed25519 cryptographic signatures for reserve backing and executes primary dealer repurchase agreements.
4. **Backend API & Faucet Services:** Manages account onboarding, fee sponsorship, and rate-limiting.

---

## 2. Threat Analysis by Category

### 2.1 Key Custody Risks

| Threat Vector | Severity | Threat Description | Mitigations Implemented | Residual Risk |
| :--- | :---: | :--- | :--- | :--- |
| **Custodian Key Compromise** | High | An attacker gains access to the custodian's private key (`STELLAR_CUSTODIAN_SECRET_KEY`) and publishes valid signatures for fictitious reserves. | • Public key is bound on-chain in the contract via `set_custodian_pubkey` (Admin only).<br>• Monotonic timestamp enforcement prevents backdating.<br>• Dual audit trail: off-chain PDF hash is cross-verified on Horizon `manage_data`. | In production, single Ed25519 key must be replaced by institutional MPC (e.g. Fireblocks, Qredo) or 3-of-5 multisig. |
| **Admin Key Compromise** | Critical | Attacker acquires admin secret key to add unauthorized members, pause the contract, or change the custodian pubkey. | • Admin cannot withdraw deposited `mZAR` directly; funds can only swap for `ZATBILL` via `invest(...)` or settle at maturity.<br>• Claims are pull-based and restricted to enrolled members. | Demo environment uses single admin keypair; production requires multisig governance (e.g. Soroban DAO or 2-of-3 threshold). |
| **Member Key Compromise** | Medium | A member's secret key is stolen after maturity. | • Payout can only be transferred to the enrolled member address.<br>• Double claims are prevented by contract state checks. | If member's wallet is compromised, attacker could claim the payout to that address. |

---

### 2.2 Sponsor Abuse & DoS Risks

| Threat Vector | Severity | Threat Description | Mitigations Implemented | Residual Risk |
| :--- | :---: | :--- | :--- | :--- |
| **Trustline Sponsorship Drainage** | Medium | Sybil attacker creates thousands of ephemeral keypairs and requests sponsored ZATBILL trustlines to deplete the sponsor's native XLM reserves. | • Faucet cooldown limiter enforces 24-hour rate limit per IP and per account.<br>• Persistent atomic disk store survives process restarts.<br>• Sponsor transaction construction enforces strict base fees. | IP rotation (residential proxies) could bypass rate limits on free testnet faucet. Production requires CAPTCHA and real identity verification. |
| **Fee Sponsorship Exhaustion** | Low | Attacker spams contract invocations using sponsored fees. | • StokvelPot contract invocations require member signatures; non-members cannot execute stateful contract calls. | Gas costs on Testnet are negligible, but sponsor balance should be monitored via automated alerting. |

---

### 2.3 Attestation Forgery & Proof of Backing

| Threat Vector | Severity | Threat Description | Mitigations Implemented | Residual Risk |
| :--- | :---: | :--- | :--- | :--- |
| **Signature Forgery** | Critical | Attacker submits fabricated reserve amounts with an invalid or spoofed signature to inflate the investment limit. | • Native Soroban cryptographic verification: `env.crypto().ed25519_verify(&pubkey, &msg, &sig)`.<br>• Invalid signatures cause host-level panic and transaction revert (`Error(Crypto, InvalidInput)`).<br>• Unit tests verify forged signatures are rejected. | None for Ed25519 algorithm. |
| **Signature Replay Attack** | High | Attacker captures a valid historical attestation with a higher reserve amount and replays it after reserves decrease. | • Canonical payload embeds big-endian `timestamp: u64`.<br>• Contract enforces `timestamp > current_timestamp`, rejecting stale or replayed payloads with `Error::InvalidTimestamp`. | Relies on ledger timestamp accuracy (within protocol bounds). |
| **Payload Malleability** | Medium | Attacker manipulates JSON whitespace or text formatting to bypass signature verification. | • Message format is strictly binary (41 bytes canonical): `b"ZATBILL_RESERVES:"` (17B) + `reserves: i128` (16B) + `timestamp: u64` (8B). | Eliminates all string serialization ambiguities. |
| **Off-Chain PDF Tampering** | Medium | Mock custody statement PDF is edited to state false asset holdings while retaining the same file link. | • SHA-256 hash of the exact PDF buffer is verified against `/attestation.json` and onchain Horizon `manage_data`.<br>• Any byte difference causes verification to fail. | In production, PDF must be pinned to IPFS / Filecoin with immutable CID. |

---

### 2.4 Primary Dealer Risks

| Threat Vector | Severity | Threat Description | Mitigations Implemented | Residual Risk |
| :--- | :---: | :--- | :--- | :--- |
| **Settlement Default (Counterparty Risk)** | High | Primary dealer fails to repurchase `ZATBILL` for face value at maturity, leaving the pot holding tokens. | • Dual-auth atomic investment ensures dealer delivers tokens simultaneously with `mZAR` transfer.<br>• In production, dealer must post collateral or margin. | In this demo implementation, dealer repurchase at maturity relies on an off-chain automated daemon (`demo:mature`). |
| **Discount Pricing Manipulation** | Medium | Dealer charges an inflated price (depressing yield) during `invest`. | • Contract enforces `discount_price > 0` and `discount_price < face_value`.<br>• Off-chain pricing is strictly calculated using standard SARB Money Market discount formula (Actual/365). | Off-chain quoting engine must be cross-checked against benchmark oracle in production. |

---

### 2.5 Testnet Resets & Ledger Storage TTLs

| Threat Vector | Severity | Threat Description | Mitigations Implemented | Residual Risk |
| :--- | :---: | :--- | :--- | :--- |
| **Quarterly Testnet Wipes** | High | Stellar Development Foundation periodically resets the Testnet ledger, wiping all contract instances, balances, and accounts. | • Automated bootstrapping script (`pnpm chain:bootstrap`) provisions fresh identities and tokens.<br>• Automated deployment scripts (`pnpm demo:invest`) re-deploy and re-initialize pots on demand. | Historical transaction links become invalid after a network wipe. |
| **Storage TTL Expiration** | Medium | Soroban contract instance or storage entries expire if not extended, causing contract calls to fail. | • Contract explicitly calls `env.storage().instance().extend_ttl(...)` on initialization and every state transition.<br>• Threshold set to 100,000 ledgers (~6 days) with 200,000 ledger extension (~12 days). | In long-running pots, keeper scripts must maintain TTLs before maturity. |

---

## 3. Known Limitations & Prototype Constraints

The following explicit known limitations apply to this prototype:

1. **Unaudited Smart Contracts:** Neither the `StokvelPot` contract nor the underlying test scripts have undergone a professional third-party cybersecurity audit. Never use the word "audited" to describe this software.
2. **Synthetic Data Only:** All South African ID numbers, phone numbers, and member names are strictly synthetic. No real PII is handled, stored, or transmitted (POPIA compliance).
3. **Simulated Reserves & Custody:** The custodian (`GAP6...`) and National Treasury / SARB Treasury Bills are mock instruments on Stellar Testnet. No real fiat ZAR or sovereign bonds back these tokens.
4. **Time-Compressed Maturities:** For evaluation convenience, the demo Treasury Bill matures in 120 seconds rather than 91 or 182 days.
5. **Single-Signer Administrative Controls:** Pot administrative functions (adding members, pausing) rely on a single keypair rather than a multi-signature committee or decentralized autonomous organization (DAO).
6. **No On-Chain Loop Execution:** In accordance with Soroban gas optimization guardrails, the contract contains zero unbounded loops over member lists; claims are strictly pull-based per member.

---

## 4. Threat Matrix Summary

| Threat ID | Threat Name | Impact | Likelihood | Mitigation Status |
| :--- | :--- | :---: | :---: | :---: |
| **TM-01** | Unauthorized Token Transfer (Unverified Wallet) | High | High | **Fully Mitigated** (Horizon `AUTH_REQUIRED_FLAG` rejection) |
| **TM-02** | Frozen Wallet Transfer Attempt | High | Low | **Fully Mitigated** (Horizon `AUTH_REVOCABLE_FLAG` rejection) |
| **TM-03** | Non-Member Pot Contribution | Medium | High | **Fully Mitigated** (Soroban revert `Error::NotMember`) |
| **TM-04** | Over-Cap Deposit | Medium | Medium | **Fully Mitigated** (Soroban revert `Error::OverCap`) |
| **TM-05** | Premature Share Claim | High | Medium | **Fully Mitigated** (Soroban revert `Error::NotMatured`) |
| **TM-06** | Double Claim / Share Draining | Critical | Medium | **Fully Mitigated** (Soroban revert `Error::AlreadyClaimed`) |
| **TM-07** | Attestation Signature Forgery | Critical | Low | **Fully Mitigated** (Soroban host `env.crypto().ed25519_verify`) |
| **TM-08** | Attestation Replay Attack | High | Medium | **Fully Mitigated** (Monotonic `timestamp` guard) |
| **TM-09** | Investment Above Attested Reserve | High | Low | **Fully Mitigated** (Soroban revert `Error::ExceedsAttestedReserves`) |
| **TM-10** | Execution on Incorrect Network | Critical | Low | **Fully Mitigated** (`assertTestnetConfiguration` guardrail) |
