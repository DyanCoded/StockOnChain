# South African & Pan-African Payment Rails & Stellar Anchor Landscape

**Research Date:** November 2026  
**Document Purpose:** In-depth research detailing real-world South African and wider African payment rails, regulatory licensing frameworks, Stellar anchor off-ramp architectures, and the production transition pathway for **StockOnChain** pursuant to **Issue I-02** and **ADR-004**.

> [!IMPORTANT]
> **Strict Demonstration & Prototype Disclaimer:**
> StockOnChain is an unaudited prototype deployed on Stellar Testnet using simulated mock assets (`mZAR`, `ZATBILL`). **Zero claims of live banking partnerships, active payment rail integrations, or financial service licenses exist anywhere in this project.** All local payout rails in the application are simulated testnet components.

---

## 1. South African National Payment System (NPS) Overview

South Africa possesses one of the most sophisticated and strictly regulated financial systems in Africa, overseen by the **South African Reserve Bank (SARB)** and the **Financial Sector Conduct Authority (FSCA)** under the National Payment System Act (Act No. 78 of 1998) and the Financial Advisory and Intermediary Services (FAIS) Act.

```
       +-------------------------------------------------------+
       |             South African Reserve Bank (SARB)         |
       |       National Payment System Department (NPSD)       |
       +---------------------------+---------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
+-------------------+                               +-------------------+
|      BankservAfrica|                              |      SAMOS / RTGS  |
|  - PayShap (RPP)  |                               |  - Real-Time Gross|
|  - RTC (EFT)      |                               |    Settlement     |
|  - NAEDO / DebiCheck                              +-------------------+
+--------+----------+
         |
         +-------------------------+-------------------------+
         |                         |                         |
         v                         v                         v
+-------------------+     +-------------------+     +-------------------+
| Commercial Banks  |     |   Fintech / SOEs  |     |   Retail Chains   |
| Standard Bank     |     | Ozow, Stitch,     |     | Shoprite Money    |
| First National Bnk|     | Peach Payments,   |     | Market, Pick n Pay|
| Absa, Nedbank     |     | Vodacom VodaPay,  |     | Boxer (Cash Out)  |
| Capitec, Discovery|     | MTN MoMo          |     |                   |
+-------------------+     +-------------------+     +-------------------+
```

### 1.1 Local Instant Payout Rails

1. **PayShap (Rapid Payments Programme - RPP):**
   - **Operator:** BankservAfrica in partnership with the SARB and commercial banks.
   - **Launch Date:** March 2023.
   - **Mechanism:** Real-time interbank credit transfer (clearing and settlement under 10 seconds, 24/7/365).
   - **Addressing:** Uses account numbers or "ShapID" (a registered mobile phone number), drastically lowering payment friction for informal stokvel members.
   - **Transaction Limits:** Up to R3,000 per transaction for low-value instant payments; higher tier up to R50,000.
   - **Official Source:** [BankservAfrica PayShap Portal](https://www.bankservafrica.com/our-solutions/payshap) & [SARB Vision 2025](https://www.resbank.co.za/en/home/what-we-do/payments-and-settlements).

2. **Real-Time Clearing (RTC / Instant EFT):**
   - **Operator:** BankservAfrica.
   - **Mechanism:** Immediate interbank electronic fund transfer across all clearing banks. Settlement occurs within 15–60 seconds.
   - **Cost Structure:** Typically fixed retail fee of R5.00 to R10.00 charged by commercial banks.
   - **Official Source:** [BankservAfrica Payment Services](https://www.bankservafrica.com/our-solutions).

3. **Retail Cash Out & Money Market Accounts (Till Cash-Out):**
   - **Providers:** Shoprite Money Market Account, Pick n Pay, Boxer Superstores.
   - **Significance for Stokvels:** Millions of informal stokvel members unbanked or underbanked withdraw grocery stokvel funds directly at supermarket tills via mobile barcode/PIN.
   - **Official Source:** [Shoprite Holdings Money Market Services](https://www.shopriteholdings.co.za/).

---

## 2. Pan-African Mobile Money & Cross-Border Rails

Outside South Africa, sub-Saharan Africa leads globally in mobile money adoption:

| Rail / Provider | Primary Markets | Licensing / Regulatory Authority | Settlement Speed | Relevance to Stokvels / Chamas | Official Source |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **M-PESA (Safaricom / Vodacom)** | Kenya, Tanzania, Mozambique, DRC, Ethiopia | Central Bank of Kenya (CBK), Bank of Tanzania (BOT) | Instant (< 5 sec) | Used by 90%+ of East African "Chamas" (savings groups). | [Safaricom M-PESA](https://www.safaricom.co.ke/mpesa) |
| **MTN Mobile Money (MoMo)** | Uganda, Ghana, Nigeria, Rwanda, Ivory Coast | Central Bank of Nigeria (PSB license), Bank of Ghana | Instant (< 10 sec) | Dominant savings and micro-insurance distribution channel in West/Central Africa. | [MTN MoMo](https://www.mtn.com/our-services/fintech/) |
| **Airtel Money** | East, Central, and Francophone Africa | Respective Central Banks across 14 African nations | Instant (< 10 sec) | Interoperable mobile wallet for rural and agricultural collective pots. | [Airtel Africa](https://airtel.africa/) |
| **PAPSS (Pan-African Payment and Settlement System)** | African Union (AU) / AfCFTA member states | African Export-Import Bank (Afreximbank) & AU | Real-time local currency settlement | Enables intra-African trade and cross-border group remittances without USD intermediation. | [PAPSS Official](https://papss.com/) |

---

## 3. Stellar Anchor Landscape in Africa

Stellar anchors serve as fiat on/off-ramp bridges between the Stellar ledger and local banking/mobile payment rails using **SEP-24** (Hosted Deposit and Withdrawal) and **SEP-31** (Cross-Border Remittances).

### 3.1 Real-World African Stellar Anchors & Partners

1. **Yellow Card:**
   - **Coverage:** 20+ African countries (including Nigeria, Kenya, Ghana, Uganda, South Africa, Zambia).
   - **Stellar Integration:** Licensed pan-African on/off ramp partner providing local currency rails to USDC, EURC, and digital assets on Stellar.
   - **Regulatory Status:** Licensed as a Crypto Asset Service Provider (CASP) by the South African FSCA; registered across multiple African jurisdictions.
   - **Official Source:** [Stellar.org Ecosystem Directory](https://stellar.org/ecosystem/directory) & [Yellow Card Official](https://yellowcard.io/).

2. **ClickPesa:**
   - **Coverage:** East Africa (Tanzania, Kenya, Rwanda).
   - **Stellar Integration:** Active Stellar anchor operating SEP-24 and SEP-31 endpoints connecting Stellar directly to East African mobile money (M-PESA, Tigo Pesa, Airtel Money) and local banking systems.
   - **Official Source:** [ClickPesa Anchor](https://clickpesa.com/) & [Stellar Anchor Registry](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md).

3. **Flutterwave:**
   - **Coverage:** 30+ African countries.
   - **Stellar Integration:** Partnered with Stellar to establish Pan-African remittance corridors via Stellar network.
   - **Regulatory Status:** Major Payment Service Provider (PSP) licenses from CBN, BoG, and international authorities.
   - **Official Source:** [Stellar Development Foundation / Flutterwave Partnership Announcement](https://stellar.org/press-releases/flutterwave-and-stellar-launch-new-remittance-corridors-between-europe-and-africa).

---

## 4. Regulatory Frameworks & Licensing Requirements

To transition an application like StockOnChain from a Testnet prototype to a live fiat-settled service in South Africa, an entity must hold or integrate with entities holding specific regulatory authorizations:

### 4.1 South African Regulatory Matrix

| Regulatory Authority | Regulation / Framework | Required License / Status | Applicability to StockOnChain |
| :--- | :--- | :--- | :--- |
| **FSCA** | Financial Advisory and Intermediary Services Act (FAIS) | **CASP (Crypto Asset Service Provider) Category I / II License** | Required to intermediate, exchange, or custody crypto assets (declared financial products in Oct 2022). |
| **SARB / NPSD** | National Payment System Act (1998) | **System Operator (SO) or Third-Party Payment Provider (TPPP)** | Required to disburse payouts into the National Payment System (EFT, PayShap). |
| **FIC (Financial Intelligence Centre)** | Financial Intelligence Centre Act (FICA) | **Accountable Institution (Schedule 1, Item 22)** | Mandates strict Customer Due Diligence (CDD/FICA), PEP screening, and suspicious transaction reporting. |
| **SARB FinSurv** | Exchange Control Regulations (1961) | **Authorised Dealer in foreign exchange with limited authority (ADLA)** | Required if any cross-border remittances or foreign exchange conversion takes place. |

---

## 5. Production Pathway for StockOnChain

Because acquiring direct banking and CASP licenses requires tens of millions of ZAR in regulatory capital and multi-year compliance reviews, the viable production pathway for StockOnChain follows an **Anchor-as-a-Service / Regulated Gateway** architecture:

```
[ StockOnChain Web/Mobile PWA ]
               |
               | (SEP-24 / SEP-10 Client)
               v
[ Regulated Stellar Anchor (e.g. Yellow Card / ClickPesa / Licensed CASP) ]
               |
               +---> (FSCA Category I CASP & FICA Registered)
               +---> (BankservAfrica PayShap / RTC Clearing Member)
               |
               v
[ Member's Bank Account / Mobile Wallet (PayShap / Capitec / MoMo) ]
```

### Production Milestones:
1. **Contract Audit & Formal Verification:**
   - Complete formal verification and professional third-party smart contract audits on Soroban pot contracts before deploying to Stellar Mainnet.
2. **Anchor Selection:**
   - Partner with an FSCA-licensed CASP with direct PayShap / BankservAfrica connectivity.
   - Configure domain `stellar.toml` with the production anchor's SEP-10 and SEP-24 endpoints.
3. **Passkey Smart Accounts:**
   - Eliminate server-side custodial keys in favor of biometric device passkeys (Soroban WebAuthn).
4. **Transparent Fee & Regulatory Disclosures:**
   - Provide real-time fee breakdown (interbank switch fee, anchor conversion spread, and network gas fee) before user execution.
