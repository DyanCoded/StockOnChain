# Custodial-Lite Wallet & Fee Sponsorship Architecture

This document details the wallet custody model, transaction sponsorship architecture, rate-limiting controls, and production roadmap for **StockOnChain** pursuant to **ADR-002** and **Issue I-01**.

> [!WARNING]
> **Prototype & Testnet Only Notice:**
> The custodial-lite wallet model implemented here is designed exclusively for rapid testing, demonstration, and hackathon evaluation on the Stellar Testnet. It must **NEVER** be deployed on the Stellar Mainnet or used to hold real monetary value. Production deployment will require migrating to passkeys (smart contract accounts) or a qualified, regulated institutional custodian.

---

## 1. Plain-Language Custody Model

### Why "Custodial-Lite"?
In conventional Web3 applications, onboarding presents substantial barriers to mainstream, non-technical users:
- Generating and recording a 12-to-24-word seed phrase (risk of loss or theft).
- Needing native network tokens (XLM) just to open an account, establish a trustline, or submit a payment.
- Managing gas fees and transaction sequence numbers.

For South African stokvel members, who are accustomed to simple community-based savings pools and mobile money interfaces, requiring cryptocurrency literacy creates immediate friction.

To solve this, StockOnChain implements a **Custodial-Lite** architecture:
1. **Zero Crypto Jargon:** When a user registers, the system provisions their savings account behind the scenes without prompting them for seed phrases or private keys.
2. **Zero XLM Requirement:** The project's sponsor infrastructure pays all account creation reserves, trustline reserves, and transaction fees on Stellar Testnet. A user with 0.00 XLM can register, complete compliance verification, and participate in stokvel savings.
3. **Explicit User Consent:** Even though the server holds an encrypted representation of the account key, **no stateful transaction is signed or broadcast without explicit user confirmation in the UI**.

---

## 2. Technical Architecture & Security Design

```
+-------------------------------------------------------------------------+
|                              Application UI                             |
|    - User Signs Up / Confirms Action                                    |
|    - "Advanced" Toggle: Connect Freighter Wallet (Optional)             |
+------------------------------------+------------------------------------+
                                     |
                         HTTP POST /wallet/...
                                     |
                                     v
+------------------------------------+------------------------------------+
|                         Backend API Service                             |
|                                                                         |
|  [ CustodialWalletStore ]                                               |
|    - AES-256-GCM Encryption using WALLET_ENCRYPTION_KEY                 |
|    - Random 96-bit IV + 128-bit Auth Tag per key                        |
|    - Secrets NEVER logged, exposed, or written to disk in plaintext    |
|                                                                         |
|  [ SponsorRateLimiter ]                                                 |
|    - Per-user spend cap (e.g. 5.0 XLM)                                  |
|    - Global sponsor budget cap (e.g. 100.0 XLM)                         |
|    - Sliding window rate limits (e.g. 10 ops/minute)                    |
|                                                                         |
|  [ SponsorService ]                                                     |
|    - Provisions account reserves via CreateAccount / Sponsored Reserves |
|    - Wraps user transactions into FeeBumpTransaction (Sponsor pays fee) |
+------------------------------------+------------------------------------+
                                     |
                           FeeBumped Transaction
                                     |
                                     v
+------------------------------------+------------------------------------+
|                          Stellar Testnet                                |
|    - Inner Transaction: Signed by user's custodial keypair              |
|    - Fee-Bump Envelope: Signed & funded by STELLAR_SPONSOR_SECRET_KEY   |
+-------------------------------------------------------------------------+
```

### 2.1 Cryptographic Key Management (AES-256-GCM)
- Every custodial keypair is generated using `@stellar/stellar-sdk` `Keypair.random()`.
- The secret seed (`S...`) is immediately encrypted in memory with **AES-256-GCM** using the environment-injected `WALLET_ENCRYPTION_KEY` (32 bytes / 256 bits).
- Each encryption creates a cryptographically random 12-byte initialization vector (`iv`) and captures the 16-byte authentication tag (`tag`).
- Plaintext secret keys are **never** logged, never returned to HTTP clients, and never written to disk in unencrypted form.
- In-memory decryption occurs only during the brief transient lifecycle of signing an authorized transaction.

### 2.2 Transaction & Reserve Sponsorship
Stellar separates reserve obligations from transaction network fees:
1. **Account & Trustline Reserves:** A Stellar account requires a minimum base reserve (1.0 XLM) plus reserves per trustline (0.5 XLM each for `mZAR` and `ZATBILL`). The Sponsor account funds these reserves during the automated onboarding flow, enabling zero-balance activation.
2. **Fee-Bump Transactions:** For state-changing transactions, the user's transaction is packaged as an inner transaction. The backend constructs a Stellar `FeeBumpTransaction` where the `feeSource` is `STELLAR_SPONSOR_PUBLIC_KEY`. The sponsor signs the fee envelope, paying all network fees without deducting any XLM from the user.

---

## 3. Rate Limiting & Safety Controls

To safeguard against denial-of-service (DoS) attacks and fund drainage, the `SponsorRateLimiter` enforces three distinct guardrails:

| Control | Limit | Action on Violation |
| :--- | :---: | :--- |
| **Per-User Spend Cap** | 5.0 XLM lifetime testnet spend | Rejects request with `User sponsorship limit reached`. |
| **Global Sponsor Budget** | 100.0 XLM total network spend | Rejects request with `Sponsor budget temporarily reached`. |
| **Frequency Rate Limit** | 10 operations per minute per user | Rejects request with `Rate limit exceeded: Please wait before requesting another sponsored transaction`. |

All sponsor accounting is persisted to disk (`.local/sponsor-limits.json`) to prevent limit circumvention via service restarts.

---

## 4. Advanced User Support (Freighter Integration)

While non-technical users use the custodial-lite wallet by default, experienced Web3 users can bypass server-side custody:
- The UI exposes an **"Advanced"** dropdown containing a **"Connect Freighter"** option.
- Powered by `@creit.tech/stellar-wallets-kit`, users can sign transactions with their own non-custodial browser extension or hardware wallet.
- The UI transparently switches between `Demo Wallet (Custodial-lite)` and `Freighter Wallet` based on user selection.

---

## 5. Security Risks & Production Transition Roadmap

### Associated Risks of the Prototype Custody Model
1. **Operator Custody Risk:** In this demo implementation, the server holds encrypted copies of user keys. A compromise of both the database and `WALLET_ENCRYPTION_KEY` would compromise user funds.
2. **Single Server Point of Failure:** Key management is coordinated by the backend API service rather than a distributed threshold network.

### Production Transition Plan
Before this application could ever handle real-world fiat or mainnet assets, the following architectural upgrades must be implemented:
1. **Passkey Smart Contract Wallets (Soroban WebAuthn):**
   - Transition to Soroban-native smart accounts authenticated via device passkeys (Apple TouchID/FaceID, Android Biometrics, YubiKey).
   - Eliminates seed phrases and server custody entirely while preserving a zero-jargon user experience.
2. **Regulated Custodian Integration:**
   - For institutional or regulated stokvel deposits, integrate a licensed third-party custodian (e.g. Fireblocks, BitGo, or a South African FSCA-licensed crypto asset service provider).
3. **Soroban Relayers for Resource Rent:**
   - Migrate fee sponsorship to specialized Soroban relayer infrastructure that manages contract resource fees and storage rent alongside transaction fees.
