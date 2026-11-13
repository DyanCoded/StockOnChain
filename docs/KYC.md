# KYC & Compliance Brief: Simulated Allowlist vs. Production FICA

## Executive Summary

StockOnChain operates on the principle of regulatory compliance by design. In South Africa, collective investment schemes, credit providers, and financial institutions are subject to the **Financial Intelligence Centre Act (FICA, Act 38 of 2001)** and the **Protection of Personal Information Act (POPIA, Act 4 of 2013)**.

To demonstrate compliance on the Stellar blockchain without compromising user privacy or violating data protection laws, StockOnChain implements a **simulated KYC verification and on-chain allowlist**. This document details how the simulated flow operates and specifies exactly what a licensed KYC provider and full statutory FICA verification would replace in a production banking and asset-tokenization environment.

---

## 1. StockOnChain Simulated Verification

The current testnet implementation demonstrates the complete end-to-end user lifecycle and on-chain permissioning without handling or exposing real personal data:

| Component | Testnet Simulation | Production Equivalent |
|---|---|---|
| **ID Validation** | 13-digit format check and Luhn algorithm check on synthetic numbers | Department of Home Affairs (DHA) HANIS/ABIS biometric match |
| **Phone Verification** | Simulated 6-digit one-time PIN (OTP) | Telco network-authenticated SMS/WhatsApp OTP with SIM-swap detection |
| **User Consent** | Explicit boolean checkbox (`consent: true`) | POPIA Section 11 informed consent agreement with audit trail |
| **Allowlist Enforcement** | Issuer executes `Operation.setTrustLineFlags({ authorized: true })` | Automated compliance engine signs authorization post-due-diligence |
| **Administrative Revocation** | Issuer executes `Operation.setTrustLineFlags({ authorized: false })` | Real-time sanctions or fraud freeze via compliance ops dashboard |
| **PII Storage** | **Zero PII stored**. Only account public key and timestamp recorded | Off-chain encrypted vault (AES-256) with 5-year statutory retention |

---

## 2. What a Licensed KYC Provider Replaces in Production

In a production environment, self-attested ID and phone numbers are legally insufficient for Customer Due Diligence (CDD). A registered South African Accountable Institution must integrate with an accredited identity verification provider (e.g., Smile Identity, VerifyID, LexisNexis Risk Solutions, or IDEMIA).

A licensed provider performs four vital functions:

### 2.1 Government Database Verification (HANIS / ABIS)
- Direct API query to the South African **Department of Home Affairs (DHA)**.
- Real-time verification of the 13-digit ID against the **Home Affairs National Identification System (HANIS)** and **Automated Biometric Identification System (ABIS)**.
- Confirms:
  - Full legal names and surname.
  - Date of birth and citizenship status.
  - Vital status (alive or deceased registry check).
  - Official photographic record.

### 2.2 Biometric Liveness Detection
- **Presentation Attack Detection (PAD)** certified under ISO/IEC 30107-3.
- Active/passive 3D selfie liveness check preventing screen-replay, printed photos, 3D masks, and generative AI deepfakes.
- Automated 1:1 facial biometric matching between the user's live selfie and the official DHA database photograph.

### 2.3 Document Forensic Authentication
- Optical Character Recognition (OCR) and barcode reading of:
  - South African Smart ID cards.
  - Green barcoded ID books.
  - Foreign passports and refugee permits.
- Forensic integrity checks: micro-print detection, optical variable ink analysis, font consistency, and tamper detection.

### 2.4 Proof of Residential Address (PoA)
- Automated extraction and validation of utility bills, municipal rates notices, bank statements, or registered lease agreements dated within 3 months.
- Geocoding and normalization against the South African National Address Database.

---

## 3. Full Statutory FICA Verification Process

Under FICA Amendment Act (Act 1 of 2017) and subsequent updates, onboarding a member to a financial product requires a Risk-Based Approach (RBA):

### 3.1 Customer Due Diligence (CDD) & Risk Profiling
- Identification of beneficial ownership for group accounts or legal entities.
- Assessing customer risk tier (Low, Medium, High) based on occupation, source of funds, transaction volume expectations, and geographic location.
- **Enhanced Due Diligence (EDD)** applied to high-risk profiles or high-value stokvel pots.

### 3.2 Sanctions and PEP Screening
- Real-time screening against global and domestic watchlists:
  - United Nations Security Council Sanctions Lists (UNSC).
  - Targeted Financial Sanctions (TFS) issued by the South African Financial Intelligence Centre (FIC).
  - Domestic Prominent Influential Persons (DPIPs) and Foreign Prominent Public Officials (FPPOs), formerly Politically Exposed Persons (PEPs).
  - Immediate family members and known close associates of prominent individuals.

### 3.3 Ongoing Transaction Monitoring & Reporting
- Continuous automated monitoring for structuring, sudden velocity spikes, or abnormal transaction patterns.
- Statutory reporting to the Financial Intelligence Centre via the **goAML** system:
  - **Section 28 (Cash Threshold Reporting - CTR)**: Mandatory reporting of transactions involving cash exceeding the statutory threshold (R49,999.99).
  - **Section 29 (Suspicious Activity Reports - SAR / STR)**: Mandatory reporting of any transaction suspected of involving proceeds of unlawful activity or tax evasion.
  - **Section 28A (Terrorist Property Reporting - TPR)**: Immediate reporting of any asset linked to identified terrorist entities.

### 3.4 Statutory Record-Keeping (Section 22)
- All customer identification records, verification documents, and transaction logs must be stored securely for a minimum of **5 years** from the date the business relationship is terminated.

---

## 4. On-Chain Allowlist Architecture on Stellar

A core design tenet of StockOnChain is **cryptographic separation of compliance state and private data**.

### Why Personal Data Must Never Go On-Chain
Under POPIA:
- **Section 10 (Minimality)**: Personal information may only be processed if it is adequate, relevant, and not excessive.
- **Section 14 (Retention)**: Records must not be retained longer than necessary and must be deleted or de-identified when authority expires.

Blockchains are public, globally replicated, and immutable. Writing names, phone numbers, or ID numbers—even encrypted or hashed—to a public ledger risks permanent privacy violations, rainbow-table cracking, and breaches of POPIA.

### Stellar Protocol Compliance Architecture
StockOnChain solves this using native Stellar asset control flags:

```
[User Wallet] ---- (Simulated KYC / FICA) ----> [Compliance Service]
                                                         |
                                            (Validates & Records Off-Chain)
                                                         |
                                                         v
                                              [Issuer Keypair]
                                                         |
                                        Operation.setTrustLineFlags
                                            flags: { authorized: true }
                                                         |
                                                         v
                                                [Stellar Ledger]
                                        (Trustline marked Authorized: true)
                                              * ZERO PII on Ledger *
```

1. **`AUTH_REQUIRED`**: When the ZATBILL asset was issued, the issuer established the `AUTH_REQUIRED` flag. Every new holder trustline defaults to unauthorized (`is_authorized: false`).
2. **On-Chain Allowlist Execution**: When verification succeeds, the issuer submits `Operation.setTrustLineFlags({ trustor: member, asset: ZATBILL, flags: { authorized: true } })`.
3. **Deterministic Enforcement**: Stellar Core and Soroban automatically prevent unauthorized transfers (`tx_failed, op_not_authorized`). No custom contract logic or fragile oracle is required.
4. **Administrative Revocation & Freezing (`AUTH_REVOCABLE`)**: If a member fails ongoing AML monitoring, triggers a sanctions alert, or requests account closure, the issuer executes `flags: { authorized: false }`. Transfers are blocked immediately while existing balances remain securely locked pending legal resolution.

---

## 5. Security & AI Guardrails Compliance

- **G1 No secrets**: Secret keys (`S...`), seed phrases, and environment files are never exposed in prompts, web interfaces, or git commits.
- **G6 Honesty**: All testnet assets (`mZAR`, `ZATBILL`) are prominently labelled as `MOCK` with explicit disclosures that no real fiat reserves or government treasury securities exist.
- **G7 Data protection (POPIA)**: All test cases, seed files, and API fixtures strictly employ synthetic data (e.g., `9001015000085`). Server logging sanitizes incoming payloads to guarantee zero PII leakage.
