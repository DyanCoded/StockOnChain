# ADR-005: Governance and Community Token Deferral (Securities and Collective-Investment Law Risk)

- Status: Accepted
- Date: 2026-11-14

## Plain-Language Explanation

Early concept ideation for StockOnChain explored an 75%–80% community token allocation (governance/utility token) distributed to stokvel members and savings club participants. 

This Architecture Decision Record (ADR-005) formally records the architecture and legal decision: **No governance, community, equity, or speculative tokens will be issued at launch or anywhere in the prototype architecture.** The historical 75%–80% community token allocation is formally recorded as a long-term research idea that is deferred indefinitely due to severe securities-law and collective-investment scheme risks under South African law.

StockOnChain operates solely around rules-based savings pots holding tokenized short-term debt instruments (Treasury Bills) denominated in South African Rand. Introducing a speculative or governance token would fundamentally alter the legal character of the application, converting a transparent savings club management tool into an unauthorized Collective Investment Scheme (CIS) or unregistered public securities offering.

---

## Option Paths Considered

### Option A: Issue a Community/Governance Token at Launch (Historical 75%–80% Model)
Distribute a native ERC-20 / Soroban token representing community voting rights, governance over pot parameters, and fee discounts, with 75%–80% allocated to community members and 20%–25% reserved for core contributors/treasury.

- **Pros:**
  - Aligns with traditional Web3 "decentralized community ownership" narratives.
  - Potential mechanism to bootstrap user acquisition through speculative token rewards.
- **Cons:**
  - **Severe Securities & CIS Risk:** Under Section 1 of the Financial Markets Act 19 of 2012 (FMA) and the Collective Investment Schemes Control Act 45 of 2002 (CISCA), issuing a tradable token that pools participant funds or confers an expectation of profit derived from common managerial efforts triggers mandatory licensing as a Collective Investment Scheme manager or securities exchange.
  - **FAIS Financial Product Classification:** Under FSCA Declaration 135 of 2022, crypto assets are declared financial products under FAIS. Marketing or issuing tokens with promised appreciation requires a Financial Services Provider (FSP) Category I or II licence.
  - **Stokvel Mission Contradiction:** Stokvel members rely on predictability, capital preservation, and transparent mutual aid. Speculative token price volatility exposes vulnerable community savers to severe principal loss.
  - **Exchange Control Violations:** Under the Currency and Exchanges Act 9 of 1933 and SARB Exchange Control Regulations, cross-border token trading without authorized dealer approval violates South African capital controls.

### Option B: Dual-Token Model (mZAR Stablecoin + ZATBILL T-Bill + Secondary Governance Token)
Separate the savings medium from governance, using a secondary non-transferable soulbound NFT or voting weight token for stokvel rule voting.

- **Pros:**
  - Enables on-chain voting for pot parameters without speculative token trading.
- **Cons:**
  - Adds unnecessary smart-contract complexity and gas overhead for basic stokvel operations.
  - Still creates confusion regarding membership legal standing and fiduciary duty among stokvel committee members.

### Option C: Zero Governance Tokens; Pure Financial Infrastructure (Selected & Recommended)
StockOnChain issues **zero** governance, equity, or community tokens. The architecture strictly limits ledger assets to:
1. **mZAR (Mock Testnet Rand):** A unit-of-account stablecoin simulation representing cash contributions and payouts.
2. **ZATBILL (Tokenized Treasury Bill):** A 1:1 asset-backed token representing custody-held South African Government Treasury Bills with verifiable proof of backing.

- **Pros:**
  - **Regulatory Clarity:** Completely avoids securities issuance, CIS pooling violations, and unregistered public offerings.
  - **True Stokvel Alignment:** Preserves the core South African stokvel legal exemption (Banks Act Exemption Notice 404 of 2012) where members retain direct visibility and mutual control over their specific pot.
  - **Simplicity & Trust:** Eliminates speculative token volatility, liquidity fragmentation, and tokenomics dilution risks.
  - **Auditability:** Every transaction is a direct Rand contribution, T-Bill purchase, or pro-rata maturity payout.

---

## Decision

**We formally adopt Option C.**

1. **No Governance Token at Launch:** StockOnChain will not mint, issue, distribute, or list any governance, community, or incentive tokens.
2. **Historical Allocation Recorded as Deferred:** The historical concept of an 75%–80% community token allocation is archived and deferred indefinitely. Re-evaluating any form of decentralized governance token will require:
   - Written legal counsel opinion confirming compliance with FSCA, FAIS, CISCA, and the Financial Markets Act.
   - Formal engagement with the South African Intergovernmental Fintech Working Group (IFWG) Regulatory Sandbox.
   - Direct authorization from the South African Reserve Bank (SARB) Financial Surveillance Department regarding exchange control regulations.
3. **Current Scope:** The platform remains strictly a software tool facilitating rules-based stokvel savings and transparent asset custody.

---

## Official Sources & Legal Authorities

- **FSCA Declaration of a Crypto Asset as a Financial Product:** Financial Sector Conduct Authority, General Notice 135 of 2022 under the Financial Advisory and Intermediary Services Act 37 of 2002 (FAIS Act).
  [https://www.fsca.co.za/Regulatory%20Frameworks/Temp/FSCA%20Notice%20135%20of%202022.pdf](https://www.fsca.co.za/Regulatory%20Frameworks/Temp/FSCA%20Notice%20135%20of%202022.pdf)
- **Financial Markets Act 19 of 2012 (FMA):** Definitions of "securities" and licensing requirements for exchanges and market infrastructures.
  [https://www.gov.za/documents/financial-markets-act](https://www.gov.za/documents/financial-markets-act)
- **Collective Investment Schemes Control Act 45 of 2002 (CISCA):** Regulations governing the pooling of investor funds, open-ended investment schemes, and management companies.
  [https://www.gov.za/documents/collective-investment-schemes-control-act](https://www.gov.za/documents/collective-investment-schemes-control-act)
- **Banks Act 94 of 1990 - Exemption Notice 404 (Common Bond Stokvel Exemption):** Government Gazette No. 35368, exempting rotating and group savings schemes with common bond from the definition of "the business of a bank".
  [https://www.gov.za/documents/banks-act-exemption-notice-common-bond-stokvels](https://www.gov.za/documents/banks-act-exemption-notice-common-bond-stokvels)
- **Currency and Exchanges Act 9 of 1933 & SARB Exchange Control Regulations:** Cross-border capital flow restrictions and FinSurv reporting mandates.
  [https://www.resbank.co.za/en/home/what-we-do/financial-surveillance](https://www.resbank.co.za/en/home/what-we-do/financial-surveillance)
