# South African Regulatory & Legal Compliance Framework

> **IMPORTANT LEGAL DISCLAIMER & NOTICE**  
> This document is authored for research, architecture analysis, and software development purposes for the StockOnChain prototype on the Stellar Testnet. **This document does not constitute legal, regulatory, tax, or investment advice.** StockOnChain does not currently hold any financial services license, credit provider license, or banking license, nor does it participate in an active regulatory sandbox. Commercial production deployment will require direct engagement with qualified South African legal counsel, formal regulatory approvals, and authorized licensing partners.

---

## 1. Executive Summary & Purpose

StockOnChain is a software protocol exploring tokenized collective savings ("stokvels") backed by short-term South African Government Treasury Bills (ZATBILL) on the Stellar network.

To transition from a Testnet prototype to a commercial production service in South Africa, the platform must navigate six distinct regulatory domains:
1. **Financial Advisory and Intermediary Services (FAIS Act & FSCA Declaration 135 of 2022)**
2. **Securities & Collective Investment Schemes (Financial Markets Act & CISCA)**
3. **Anti-Money Laundering & Terrorist Financing (FICA - Financial Intelligence Centre Act)**
4. **Data Protection & Privacy (POPIA - Protection of Personal Information Act)**
5. **Exchange Control & Cross-Border Capital Flows (SARB FinSurv Regulations)**
6. **National Payment System & Settlement (National Payment System Act 78 of 1998)**

This document analyzes each legal domain against official South African financial authority publications, compares the current Testnet MVP against production legal requirements, integrates findings regarding Rand stablecoins on Stellar (task T-02 / [docs/B-02.md](./B-02.md)), and defines the partner ecosystem required for lawful operation.

---

## 2. Regulatory Domain Breakdown & Comparison: MVP vs. Production

### 2.1 FSCA Declaration 135 of 2022 & FAIS Act (Crypto Assets as Financial Products)
- **Regulatory Framework:** In October 2022, the Financial Sector Conduct Authority (FSCA) gazetted General Notice 135 of 2022 under Section 1(h) of the Financial Advisory and Intermediary Services Act 37 of 2002 (FAIS Act), declaring a **crypto asset** to be a financial product. Any entity providing financial advice or intermediary services relating to crypto assets must be licensed as a **Crypto Asset Financial Services Provider (Crypto FSP)** under FAIS.
- **Official Authority Source:** FSCA Notice 135 of 2022, Government Gazette No. 47334 ([FSCA Official Notice](https://www.fsca.co.za/Regulatory%20Frameworks/Temp/FSCA%20Notice%20135%20of%202022.pdf)).
- **MVP Implementation:**
  - Operates strictly on the **Stellar Testnet** using simulated demo tokens (`mZAR` and `ZATBILL`).
  - No real funds, fiat rand, or commercial crypto assets are solicited, accepted, or managed.
  - Zero financial advice or discretionary investment management is provided; the UI presents factual, transparent rule calculations and simulated yield metrics explicitly labeled as indicative.
- **Production Commercial Requirements:**
  - Must either obtain an **FSP Category I (Advisory/Intermediary)** licence from the FSCA or partner with an authorized, licensed Crypto FSP (e.g., Luno, VALR, Sygnia, or Altvest Capital) who holds the requisite FAIS license to distribute and intermediate tokenized products.
  - Must appoint an approved Compliance Officer and maintain Key Individual (KI) qualifications under FAIS Fit and Proper requirements (Board Notice 194 of 2017).

---

### 2.2 Securities Law & Collective Investment Schemes (FMA & CISCA)
- **Regulatory Framework:** 
  - **Financial Markets Act 19 of 2012 (FMA):** Regulates financial markets, market infrastructure (licensed exchanges, central securities depositories, clearing houses), and the issuance of "securities" (shares, debentures, bonds, derivatives).
  - **Collective Investment Schemes Control Act 45 of 2002 (CISCA):** Regulates schemes where investor contributions are pooled to share investment risks and returns under the management of an approved manager.
  - **Banks Act 94 of 1990 - Common Bond Stokvel Exemption (Notice 404 of 2012):** Stokvels, rotating credit associations, and traditional savings clubs are exempted from the definition of "the business of a bank" provided they: (a) operate on a common bond (family, church, community, workplace); (b) pool funds for mutual aid; (c) limit individual member deposits to designated caps; and (d) do not exceed R100,000 per member or solicit funds publicly from the open market.
- **Official Authority Sources:**
  - Financial Markets Act 19 of 2012 ([Gov Gazette](https://www.gov.za/documents/financial-markets-act))
  - Collective Investment Schemes Control Act 45 of 2002 ([Gov Gazette](https://www.gov.za/documents/collective-investment-schemes-control-act))
  - Banks Act Exemption Notice 404 of 2012, Government Gazette No. 35368.
- **MVP Implementation:**
  - The prototype implements private, invite-only stokvel pots with bounded membership (e.g., maximum 5 to 20 members) and strict per-member contribution caps (enforced on-chain by the Soroban smart contract via `Error::OverCap`).
  - **Zero Governance / Speculative Tokens:** Formally recorded in **ADR-005**, no governance or speculative community tokens are minted or distributed, completely avoiding CIS pooling violations and unregistered public securities offerings.
- **Production Commercial Requirements:**
  - **Direct T-Bill Custody via Special Purpose Vehicle (SPV) / Trust:** Commercial deployment requires establishing an insolvency-remote Trust or Special Purpose Vehicle (SPV) administered by a licensed trust administrator (e.g., Maitland / Apex Group, Sanne / Apex).
  - The SPV holds legal title to the RSA Treasury Bills through an authorized Central Securities Depository Participant (CSDP) member of Strate (South Africa's licensed Central Securities Depository).
  - Tokenized shares in the SPV must be structured either under a Section 96 Companies Act private placement exemption (not offered to the public) or managed under a licensed Collective Investment Scheme (CIS) manager approved by the FSCA.

---

### 2.3 Anti-Money Laundering & Counter-Terrorist Financing (FICA)
- **Regulatory Framework:** In December 2022, Schedule 1 of the Financial Intelligence Centre Act 38 of 2001 (FICA) was amended by the Minister of Finance to designate **Crypto Asset Service Providers (CASPs)** as **Accountable Institutions (Item 22)**. Accountable institutions must register with the FIC, perform Customer Due Diligence (CDD/KYC), verify identity against national registries, screen for Politically Exposed Persons (PEPs) and targeted financial sanctions, report cash threshold transactions (CTR) above R49,999.99, and report suspicious and unusual transactions (STR) under Section 29.
- **Official Authority Source:** Financial Intelligence Centre Act Schedule 1 Amendments, Government Gazette No. 47596 (29 November 2022) ([FIC Official Publication](https://www.fic.gov.za)).
- **MVP Implementation:**
  - Simulated KYC onboarding flow (`services/api/src/kyc.ts` and `apps/web/app/components/kyc-allowlist.tsx`) verifying synthetic South African 13-digit ID numbers using the Luhn validation algorithm and mobile OTP verification.
  - Zero PII or real national IDs are stored or accepted. All logs are scrubbed via redaction filters.
  - Testnet issuer compliance trustlines enforce authorization flags (`AUTH_REQUIRED_FLAG`, `AUTH_REVOCABLE_FLAG`, and `AUTH_CLAWBACK_ENABLED_FLAG`) to demonstrate regulatory freezing and clawback capabilities (T-04 & T-08).
- **Production Commercial Requirements:**
  - Registration with the Financial Intelligence Centre (FIC) as an Accountable Institution (Item 22).
  - Integration with licensed South African identity verification and biometric providers (e.g., Smile ID, LexisNexis Risk Solutions, or Didomi / PBVerify) with direct lookup against the Department of Home Affairs (HANIS/ABIS) database.
  - Implementation of automated AML watchlist screening (OFAC, UN, SARB sanctions lists, PEP databases).
  - Ongoing transaction monitoring and automated Section 28 (CTR) and Section 29 (STR) reporting directly to the FIC goAML portal.

---

### 2.4 Protection of Personal Information Act (POPIA)
- **Regulatory Framework:** Protection of Personal Information Act 4 of 2013 (POPIA), enforced by the Information Regulator of South Africa. Governs the lawful processing of personal data, requiring minimization, security safeguards, specific consent, and strict limits on cross-border data transfer.
- **Official Authority Source:** Protection of Personal Information Act 4 of 2013 ([Information Regulator SA](https://inforegulator.org.za/)).
- **MVP Implementation:**
  - Strictly **zero personal data (PII)** or raw phone numbers appear in server logs, application databases, or on-chain ledger records.
  - Mobile numbers are normalized and cryptographically hashed using SHA-256 with server-side salt before storage (`services/api/src/notification.ts`).
  - Strict compliance with STOP keyword opt-out for SMS/WhatsApp notifications with immediate suppression.
- **Production Commercial Requirements:**
  - Appointment and registration of an Information Officer with the Information Regulator.
  - Comprehensive Privacy Notice, Data Subject Access Request (DSAR) procedures, and records of processing activities.
  - End-to-end encryption of all customer data at rest (AES-256) and in transit (TLS 1.3), with data sovereignty stored within South African data center regions (e.g., AWS Cape Town / Azure South Africa North).

---

### 2.5 Exchange Control Regulations (SARB FinSurv)
- **Regulatory Framework:** The South African Reserve Bank (SARB) Financial Surveillance Department (FinSurv) enforces the Exchange Control Regulations, 1961, issued under the Currency and Exchanges Act 9 of 1933. FinSurv strictly prohibits the cross-border transfer of capital or assets out of the Republic without prior authorized dealer approval. Crypto assets may not be used to bypass foreign exchange allowances (Single Discretionary Allowance of R1 million / Foreign Capital Allowance of R10 million per calendar year).
- **Official Authority Source:** SARB Financial Surveillance Department ([SARB FinSurv Exchange Control Guidelines](https://www.resbank.co.za/en/home/what-we-do/financial-surveillance)).
- **MVP Implementation:**
  - All simulated assets (`mZAR`, `ZATBILL`) are denominated in domestic South African Rand, deployed on Stellar Testnet, and restricted to domestic stokvel participants.
- **Production Commercial Requirements:**
  - The platform must operate strictly in domestic ZAR rails through an Authorized Dealer in foreign exchange (a registered South African commercial bank) or an approved FinSurv-licensed fintech partner.
  - Must not facilitate outbound cross-border cryptocurrency swaps without FinSurv reporting and tax clearance compliance.

---

### 2.6 National Payment System & Local Settlement (NPS Act)
- **Regulatory Framework:** National Payment System Act 78 of 1998 (NPSA) and SARB Payments Association of South Africa (PASA) / Payments Association of South Africa rules. Direct clearing and settlement (SAMOS, EFT, RTC, PayShap) is restricted to registered banks and authorized System Operators / Third-Party Payment Providers (TPPPs).
- **Official Authority Source:** SARB National Payment System Department & National Payment System Act 78 of 1998 ([SARB NPS Overview](https://www.resbank.co.za/en/home/what-we-do/national-payment-system)).
- **MVP Implementation:**
  - SEP-24 interactive deposit and cash-out flow implemented against a simulated local rail (`apps/web/app/components/cashout-simulator.tsx` and `services/api/src/sep24.ts`) mimicking instant bank payments and PayShap with realistic fee breakdowns and timing transparency. All components explicitly display "SIMULATED / TESTNET".
- **Production Commercial Requirements:**
  - Partnership with an authorized PASA-registered Third-Party Payment Provider (TPPP) or commercial bank sponsoring PayShap and Rapid Transfer Clearing (RTC) integration (e.g., Stitch, Peach Payments, Ozow, or Capitec Pay).
  - Integration with licensed Stellar anchors authorized to issue fiat-backed ZAR stablecoins under South African banking oversight.

---

## 3. Rand Stablecoin Assessment (Integration of Findings from Task T-02 / B-02.md)

As established in task T-02 and documented in [docs/B-02.md](./B-02.md), an exhaustive investigation of the Stellar Public Network (Mainnet) Horizon API was conducted to evaluate existing South African Rand (`ZAR` and `ZARP`) tokens.

### Key Horizon Mainnet Findings:
1. **Unverified Token Codes:** Multiple unrelated accounts on the Stellar Mainnet have issued assets with the code `ZAR` or `ZARP`. Because Stellar asset codes are not globally unique, any public key can issue a token called `ZAR`.
2. **Absence of Reserve Attestations:** None of the observed Mainnet `ZAR`/`ZARP` assets provided verifiable proof of reserves, active bank trust accounts, or licensed issuer metadata linking them to an authorized South African financial institution.
3. **Disconnection from Real Businesses:** While businesses like ZARP South Africa ([zarp.co.za](https://zarp.co.za/)) exist, research confirmed they are agricultural distributors with no verified relationship to Stellar Horizon issuers.

### Architectural Decision:
- **Zero Real Stablecoin Claims:** StockOnChain **never** connects to or claims integration with unverified Mainnet ZAR tokens.
- **Dedicated Testnet Mock (`mZAR`):** For prototype and demonstration purposes, StockOnChain utilizes its own dedicated, testnet-only asset (`mZAR`) issued by the simulated anchor account (`services/api/src/mzar.ts`), governed strictly by testnet assertions, with prominent disclosures that it possesses zero fiat value and cannot be redeemed for real currency.

---

## 4. Comprehensive Partner Ecosystem Map

To transition StockOnChain into a legally compliant, commercial production product, the platform requires an ecosystem of licensed institutional partners. The matrix below details each partner category, why it is operationally required, real-world examples in South Africa, and our simulated MVP stand-in:

| Partner Category | Operational Necessity | Verified South African Candidates (For Production) | MVP Stand-in (Testnet Prototype) |
| :--- | :--- | :--- | :--- |
| **1. Licensed Crypto FSP / Intermediary** | Required under FSCA Declaration 135/2022 to lawfully distribute, intermediate, and broker crypto assets to consumers in South Africa. | Luno (FSCA FSP #52471), VALR (FSCA FSP #53308), Sygnia, Altvest Capital | Internal simulated API services; explicit disclaimer of zero financial advice |
| **2. Licensed Asset / CIS Manager** | Required under CISCA to legally manage and structure pooled investor capital into interest-bearing securities. | Allan Gray, Coronation, Prescient Investment Management, Stanlib | Soroban smart contract (`StokvelPot`) simulating automated pro-rata rules |
| **3. Bond Dealer, Custodian & CSDP** | Required under Financial Markets Act to hold legal custody of RSA Government Treasury Bills via Strate (CSD). | Standard Bank CSDP, Nedbank Investor Services, RMB Custody, Absa Investor Services | Synthetic Custodian keypair (`GCUSTODIAN...`) issuing simulated signed statements |
| **4. Trust & SPV Administrator** | Required to establish an insolvency-remote legal structure (SPV/Trust) holding assets for the benefit of stokvel members. | Maitland (Apex Group), Sanne Group (Apex), GMG Trust, Stonehage Fleming | Open-source Soroban smart contract state machine |
| **5. KYC / AML Verification Provider** | Required under FICA Schedule 1 (Item 22) to perform automated ID verification, Home Affairs matching, and sanctions screening. | Smile ID, LexisNexis Risk Solutions SA, PBVerify / Didomi, ThisIsMe | Synthetic Luhn algorithm validator + synthetic OTP verification service |
| **6. Banking & Instant Rail Partner** | Required under NPS Act to clear and settle fiat Rand deposits and instant payouts (PayShap / RTC). | Stitch Money, Peach Payments, Ozow, Capitec Pay, Standard Bank OneHub | Simulated SEP-24 Payout Simulator (`CashoutSimulator.tsx`) |
| **7. Stellar Anchor & Off-Ramp** | Required to provide audited, compliant fiat on/off-ramps and institutional liquidity bridging Stellar to ZAR. | ClickPesa, Yellow Card, Bitmama, licensed South African CASPs | Simulated Anchor API (`services/api/src/sep24.ts`) |
| **8. Regulated ZAR Stablecoin Issuer** | Required to mint fully backed, 1:1 audited digital Rand on the Stellar network under banking regulations. | Future regulated banking consortium or licensed CASP with audited trust account | Testnet Anchor-sim account issuing `mZAR` with zero fiat reserves |
| **9. Specialized Legal & Regulatory Counsel** | Required to structure product documentation, obtain FSCA exemptions, and engage the SARB / IFWG Sandbox. | ENSafrica (Banking & FinTech), Bowmans, Webber Wentzel, Cliffe Dekker Hofmeyr | Internal compliance research documents (`docs/COMPLIANCE.md`, `ADR-005`) |

---

## 5. Tokenomics Architecture: Formal Deferral of Governance Tokens (ADR-005)

### 5.1 Historical Token Allocation
During preliminary ideation, a traditional decentralized tokenomics model was explored:
- **75%–80%:** Community and stokvel member distribution (governance, fee discounts, contribution staking).
- **20%–25%:** Platform development, infrastructure reserve, and core contributors.

### 5.2 Legal & Structural Risk Assessment
Following legal analysis under the Financial Markets Act 19 of 2012 and CISCA:
- Distributing a tradable community token tied to a yield-generating savings platform creates a severe risk of being classified as an **unregistered security offering** and an **unauthorized collective investment scheme**.
- Speculative token price volatility directly contradicts the primary purpose of stokvel savings: **predictable, risk-free capital preservation** for everyday South Africans.

### 5.3 Adopted Architecture (ADR-005)
1. **Zero Governance Tokens:** No community, governance, utility, or speculative tokens are issued, minted, or traded.
2. **Pure Infrastructure Model:** StockOnChain is designed exclusively as software infrastructure managing transparent, rules-based savings pots.
3. **Asset Tokens Strictly Limited to:**
   - **mZAR (Mock Testnet):** Flat accounting unit for deposits and withdrawals.
   - **ZATBILL (Tokenized Treasury Bill):** 1:1 backed debt instrument holding risk-free RSA Government paper with verifiable Ed25519 cryptographic attestations.

---

## 6. Official Authority Sources & Legal References

1. **Financial Sector Conduct Authority (FSCA):**
   - *Declaration of a Crypto Asset as a Financial Product under FAIS:* General Notice 135 of 2022, Government Gazette No. 47334, 19 October 2022.  
     URL: [https://www.fsca.co.za/Regulatory%20Frameworks/Temp/FSCA%20Notice%20135%20of%202022.pdf](https://www.fsca.co.za/Regulatory%20Frameworks/Temp/FSCA%20Notice%20135%20of%202022.pdf)
   - *Exemption of Certain Crypto Asset FSPs:* FSCA FAIS Notice 90 of 2022.
2. **Financial Intelligence Centre (FIC):**
   - *Amendments to Schedule 1 of the Financial Intelligence Centre Act (CASPs as Item 22):* Government Gazette No. 47596, 29 November 2022.  
     URL: [https://www.fic.gov.za](https://www.fic.gov.za)
3. **South African Reserve Bank (SARB):**
   - *Intergovernmental Fintech Working Group (IFWG) Position Paper on Crypto Assets:* Published by SARB, FSCA, FIC, National Treasury, and SARS, June 2021.  
     URL: [https://www.ifwg.co.za/wp-content/uploads/IFWG_Crypto_Asset_Regulatory_Framework.pdf](https://www.ifwg.co.za/wp-content/uploads/IFWG_Crypto_Asset_Regulatory_Framework.pdf)
   - *Financial Surveillance Department (FinSurv) Exchange Control Guidelines:* Currency and Exchanges Act 9 of 1933.  
     URL: [https://www.resbank.co.za/en/home/what-we-do/financial-surveillance](https://www.resbank.co.za/en/home/what-we-do/financial-surveillance)
   - *National Payment System Act 78 of 1998:* Directives on Third-Party Payment Providers and System Operators.  
     URL: [https://www.resbank.co.za/en/home/what-we-do/national-payment-system](https://www.resbank.co.za/en/home/what-we-do/national-payment-system)
4. **Parliament of the Republic of South Africa:**
   - *Banks Act 94 of 1990 - Exemption Notice 404 (Common Bond Stokvels):* Government Gazette No. 35368, 25 May 2012.  
     URL: [https://www.gov.za/documents/banks-act-exemption-notice-common-bond-stokvels](https://www.gov.za/documents/banks-act-exemption-notice-common-bond-stokvels)
   - *Financial Markets Act 19 of 2012 (FMA):* Government Gazette No. 36121.  
     URL: [https://www.gov.za/documents/financial-markets-act](https://www.gov.za/documents/financial-markets-act)
   - *Collective Investment Schemes Control Act 45 of 2002 (CISCA):* Government Gazette No. 24182.  
     URL: [https://www.gov.za/documents/collective-investment-schemes-control-act](https://www.gov.za/documents/collective-investment-schemes-control-act)
   - *Protection of Personal Information Act 4 of 2013 (POPIA):* Government Gazette No. 37067.  
     URL: [https://inforegulator.org.za/](https://inforegulator.org.za/)
