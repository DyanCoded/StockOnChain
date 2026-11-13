# ZATBILL Asset Disclosure

## MOCK mZAR

`mZAR` is a separate Stellar Testnet classic asset issued by the Anchor-sim account for UI and payment-flow demonstrations. Its Stellar Asset Contract is deterministically derived from the classic asset and deployed with `pnpm chain:mzar`. The API can issue 100 mZAR to a Testnet account after it creates an mZAR trustline; each account is limited to one request every 24 hours. Cooldowns are stored as SHA-256 account-key hashes in `.local/mzar-faucet-rate-limits.json` (or `MZAR_FAUCET_STATE_PATH`). The cooldown is reserved before submission, so a failed network submission also consumes it. A missing account or trustline does not consume the allowance.

The UI formats mZAR amounts using South African rand formatting only. It does not claim that mZAR is pegged to rand, backed by reserves, redeemable, or worth fiat. The faucet is not a bank, anchor, deposit service, or SEP-24 implementation. Run one API instance and preserve its state file across restarts; this local-file limiter is not a distributed rate-limit store. Do not connect any Mainnet ZAR/ZARP asset to this UI or faucet. See [B-02 rand-stablecoin research](./B-02.md).

## ZATBILL

MOCK ZATBILL is a Stellar Testnet demo token for exercising the stokvel pot workflow. It is not a security, real Treasury bill, payment instrument, or reserve-backed asset. Demo materials use an illustrative R1.00 face value at an example maturity and a discount purchase price; the current contract does not implement an on-chain maturity schedule or fiat redemption. No real-world redemption, yield, custody, or backing is provided or promised.

The demo represents one ZATBILL as a simulated R1.00 face-value claim at a configured maturity and models a discounted purchase price. Both mechanics are illustrative contract rules only. A payment of a classic asset to its issuer burns the asset; an issuer cannot hold its own asset. Stellar clawback also burns the tokens rather than returning them to an issuer balance.

## Issuer Flags

- `AUTH_REQUIRED`: New trustlines need issuer approval before their holder can transfer the asset. The ZATBILL test flow leaves the sponsor test account unauthorized to demonstrate a rejected payment.
- `AUTH_REVOCABLE`: The issuer can revoke authorization from an existing trustline. This prevents its holder from transferring or trading the token until authorization is restored. The issue's freeze demonstration uses this operation.
- `AUTH_CLAWBACK_ENABLED`: New trustlines receive the clawback-enabled trustline flag, allowing the issuer to claw back tokens from that trustline. Stellar burns the clawed-back amount. This issuer flag requires `AUTH_REVOCABLE` and must be set before the trustlines for which clawback is required are created.
- `AUTH_IMMUTABLE`: Deliberately not set. It is incompatible with the required/revocable authorization controls and would prevent the demo from showing issuer-controlled freeze and clawback.

These are account-level issuer flags. ZATBILL therefore uses a dedicated issuer so its controls do not unexpectedly alter the existing MOCK assets issued by the general demo issuer.

## Soroban Asset

The ZATBILL classic asset is wrapped by its deterministic Stellar Asset Contract (SAC). The pot contract stores the SAC address and can transfer ZATBILL from its own contract balance after the issuer authorizes that contract address. The issuer sends initial ZATBILL only to the dealer account. The application does not mint ZATBILL to other user accounts.

## Testnet Workflow

1. Copy `.env.example` to `.env` and run `pnpm chain:bootstrap` to create the role keys and pot contract.
2. Deploy the web app to its public HTTPS host. Set `STELLAR_HOME_DOMAIN` in `.env` to that host only (no scheme), and configure `STELLAR_HOME_DOMAIN` and `STELLAR_ZATBILL_ISSUER_PUBLIC_KEY` in the web deployment environment.
3. Run `pnpm chain:zatbill setup`. It sets the issuer flags and home domain before creating the ZATBILL trustlines, issues the demo supply only to the dealer, deploys the SAC, and authorizes/configures the pot contract.
4. Run `pnpm chain:zatbill verify` to check the unauthorized payment, authorized transfer, freeze, and clawback flows. Individual actions are available with `authorize`, `freeze`, and `clawback` commands.

Every command refuses to run unless `STELLAR_NETWORK=testnet` and the exact Stellar Testnet passphrase are configured. Successful transactions print their Stellar Testnet Horizon links. Keep secret keys in the ignored local `.env`; never commit or share them.

## Primary Dealer Pricing & Yield Engine (T-05)

### 1. South African Money Market Pricing Conventions

Treasury Bills issued by the South African Government (via the South African Reserve Bank - SARB) are short-term zero-coupon debt instruments sold at a discount to face value and redeemed at full face value (R1.00 per token) at maturity.

South African money markets adhere to the **Actual / 365** day-count convention. The primary dealer pricing engine calculates the discount purchase price per unit as:

$$P = F \times \left(1 - \frac{d \times t}{365}\right)$$

Where:
- $P$: The discount purchase price per token (in rand).
- $F$: The face value per token at maturity ($F = \text{R1.00}$).
- $d$: The annualized discount rate quoted by the dealer (e.g. $0.0825$ for $8.25\%$ p.a., or $0.10$ for $10.00\%$ demo rate).
- $t$: The tenor / term duration in days ($91$ days for standard South African Treasury bills).

### 2. Standard Financial Yield Calculation

The annualized investment yield earned by the pot is calculated using the standard money-market formula:

$$\text{Yield} = \frac{F - P}{P} \times \frac{365}{t}$$

Where:
- $\frac{F - P}{P}$ represents the holding-period return over the term $t$.
- $\frac{365}{t}$ annualizes the holding-period return under the SARB Actual/365 convention.

### 3. Non-Guaranteed Simulated Rate Disclosure (AI Guardrails G4 & G6)

> [!IMPORTANT]
> **Simulated Demo Disclosure:** All rates and yields in StockOnChain are simulated demo figures.
> - The configured dealer discount rate ($8.25\%$ to $10.00\%$ p.a.) is a test simulation.
> - Rates and returns are strictly **indicative and non-guaranteed**.
> - StockOnChain holds **no real South African Government Treasury bills, regulated banking deposits, or statutory fiat reserves**.
> - Benchmark reference: Typical South African 91-day Treasury Bill auction clearing yields range between $8.10\%$ and $8.45\%$ p.a. (Source: SARB Weekly Treasury Bill Tender Results, Actual/365 convention).

### 4. Time-Compressed Demo Bill

To enable full end-to-end verification of the on-chain pot lifecycle (`contribute -> invest -> mature -> settle -> claim`) on the Stellar Testnet without waiting 91 calendar days:

- **Standard Product:** 91-Day South African Treasury Bill ($t = 91$ days, term duration $7,862,400$ seconds).
- **Time-Compressed Product:** Short-dated demo bill option maturing in 2 minutes ($120$ seconds ledger time).
- **Visible Labeling:** Always labeled with the prominent badge: `[time compressed for demo]`. The financial pricing model calculates yield based on the 91-day benchmark discount while accelerating ledger maturity for rapid demonstration and automated testing.

### 5. Cent-Precision Rounding & Pro-Rata Distribution Rule

When the pot settles and members withdraw their returns via `claim(member)`:

$$\text{Payout} = \left\lfloor\frac{\text{Shares} \times \text{Settlement Total}}{\text{Total Shares}}\right\rfloor$$

- Integer floor division is enforced by the Soroban smart contract.
- Any fractional stroop/cent remainder from division remains in the pot contract reserve.
- This mathematically guarantees that $\sum \text{payouts} \le \text{Settlement Total}$ and $\sum \text{payouts} + \text{potRemainder} = \text{Settlement Total}$ down to the exact stroop and cent with zero overpayment or contract insolvency risk.

### 6. CLI Automation Scripts

- `pnpm demo:invest`: Initializes a time-compressed demo pot, pulls member contributions, quotes primary dealer discount pricing, and executes the dual-auth investment swap.
- `pnpm demo:mature`: Awaits the 120s maturity countdown, triggers `mature()`, settles the pot with the primary dealer at full face value, claims member payouts, and prints the verified cent-precision reconciliation table.

## Proof of Backing: Signed Attestation & On-Chain Anchor (T-06)

### 1. Mock Custodian Architecture & Disclaimers (AI Guardrails G4 & G6)

To establish transparent proof of backing for the circulating ZATBILL tokens without pretending to hold real sovereign debt or commercial banking reserves:

- **Mock Custodian Name:** `Mock Custodian Services (Pty) Ltd (Demo Only)`
- **Signer Public Key:** `GAP6QC2WHE37IY47WLPG7G375DCFLHAKP5RQLTF3LXZGC75STTBVLA2K`
- **Mock Instrument Identifier:** `MOCK-TBILL-ZA-2026-Q4-DEMO`
- **Mock Instrument Description:** Simulated South African Republic Treasury Bill (91-Day Zero-Coupon Benchmark)
- **Face Value per Unit:** R 1.00 (simulated)
- **Attested Reserves:** R 1,000.00 face value (1,000 simulated units held in segregated mock vault)

> [!WARNING]
> **Strict Mock Disclosure:** No real-world financial assets, South African Treasury Bills, commercial banking deposits, or statutory fiat reserves exist or are held. All custody statements, instrument identifiers, and signatures are generated exclusively for development, testing, and UI verification.

### 2. Mock Custody Statement PDF & Cryptographic Hash

A standardized PDF document (`mock-custody-statement.pdf`) is published at `/assets/mock-custody-statement.pdf` containing the custody declaration, as-of timestamp, custodian public key, and statutory AI disclaimers.

- **PDF Digest Algorithm:** SHA-256
- **Current PDF SHA-256 Digest:** `51d99c1974d37cc73dcd74da18e2c46a5c7341f86a14fd3a847809c75caa0c64`

### 3. Ed25519 Signed Attestation Publication

The mock custodian publishes an active `/attestation.json` endpoint. The attestation payload is deterministically serialized via recursive alphabetical key sorting (canonical JSON) and cryptographically signed with the custodian's Ed25519 keypair:

```json
{
  "documentType": "mock-custodian-reserve-attestation",
  "disclaimer": "MOCK CUSTODIAN DISCLOSURE: Strictly simulated demo attestation...",
  "custodian": {
    "name": "Mock Custodian Services (Pty) Ltd (Demo Only)",
    "publicKey": "GAP6QC2WHE37IY47WLPG7G375DCFLHAKP5RQLTF3LXZGC75STTBVLA2K",
    "location": "Mock Vault, Sandton, Johannesburg (SIMULATED)",
    "isMock": true
  },
  "asset": {
    "code": "ZATBILL",
    "issuer": "GDEPFK6O3UCEFBDWHIFXYHVNW2SG5OTHTLE3GSHJFKSKVS5JGV6M5EIU",
    "network": "testnet"
  },
  "instrument": {
    "id": "MOCK-TBILL-ZA-2026-Q4-DEMO",
    "description": "Simulated South African Republic Treasury Bill (91-Day Zero-Coupon Benchmark)",
    "faceValuePerUnit": "1.00",
    "currency": "ZAR (Simulated)"
  },
  "reserves": {
    "faceAmountHeld": "1000.00",
    "currency": "mZAR (Mock Rand)",
    "unitsHeld": 1000
  },
  "statementPdf": {
    "filename": "mock-custody-statement.pdf",
    "url": "https://stockonchain.app/assets/mock-custody-statement.pdf",
    "ipfsUri": "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/mock-custody-statement.pdf",
    "sha256": "51d99c1974d37cc73dcd74da18e2c46a5c7341f86a14fd3a847809c75caa0c64"
  },
  "asOfDate": "2026-11-13T12:00:00.000Z",
  "signature": "3e9b... (64-byte Ed25519 hex signature)"
}
```

### 4. On-Chain Anchoring & SEP-0001 Linking

The proof of backing is anchored directly to the Stellar blockchain and discoverable via SEP-0001:

1. **Issuer `manage_data` Anchor:**
   - **Key:** `zatbill_attestation_hash`
   - **Value:** `51d99c1974d37cc73dcd74da18e2c46a5c7341f86a14fd3a847809c75caa0c64` (exact 64-character SHA-256 hex string)
   - **Stellar Testnet Transaction:** [`d54605a38a0286e27c3bc397ff2780f1e5a22b656198d4e84626fe6510e21750`](https://horizon-testnet.stellar.org/transactions/d54605a38a0286e27c3bc397ff2780f1e5a22b656198d4e84626fe6510e21750)
2. **`stellar.toml` Linking (SEP-0001):**
   ```toml
   [[CURRENCIES]]
   code = "ZATBILL"
   issuer = "GDEPFK6O3UCEFBDWHIFXYHVNW2SG5OTHTLE3GSHJFKSKVS5JGV6M5EIU"
   status = "test"
   display_decimals = 2
   name = "MOCK ZATBILL"
   desc = "Testnet-only MOCK stokvel claim; backed by mock custodian signed attestation."
   attestation_of_reserve = "https://stockonchain.app/attestation.json"
   ```

### 5. Backing Ratio & Verification Logic

The verification engine compares the attested reserves against the live circulating ZATBILL supply on Stellar Testnet:

$$\text{Backing Ratio} = \left(\frac{\text{Attested Reserves}}{\text{Circulating Supply}}\right) \times 100\%$$

- **Live Horizon Query:** Queries `horizon.assets().forCode("ZATBILL").forIssuer(issuer)` to sum authorized trustlines, unauthorized balances, and contract-held tokens.
- **Ratio Assessment:**
  - $\text{Ratio} \ge 100.00\%$: `fully_backed` (healthy green indicator in UI).
  - $\text{Ratio} < 100.00\%$: `under_collateralized` (prominent warning state in UI).
- **Verification Endpoint:** `GET /api/backing` executes the full verification pipeline and returns the structured audit JSON for task A-06.

### 6. Demo Deficit Toggle for UI Warning Testing

To test and showcase how the StockOnChain UI alerts members to reserve shortfalls:
- Append `?demo_deficit=true` (or `?mode=deficit`) to `/api/backing`.
- The endpoint forces the effective ratio to **85.00%** (under-collateralized), generating a visible warning without modifying the underlying cryptographic integrity of the attestation document or PDF.

### 7. Tamper Detection & Security Guarantees

The verification engine provides zero-tolerance tamper detection:
1. **PDF Byte Alteration:** Flipping even a single bit in `mock-custody-statement.pdf` alters its SHA-256 digest, immediately failing both the `verifyPdfHash` check and the on-chain `manage_data` anchor check.
2. **Attestation Document Tampering:** Modifying any value in `attestation.json` (such as changing reserves from `1000.00` to `2000.00` or altering the instrument ID) invalidates the Ed25519 digital signature against the custodian public key.
3. **On-Chain Desynchronization:** If an unauthorized party attempts to point `stellar.toml` or `attestation.json` to a different PDF hash, it is rejected because the issuer's on-chain `manage_data` entry does not match.

### 8. Verification CLI Commands

- `pnpm chain:attestation:anchor`: Publishes or checks the PDF SHA-256 hash in the issuer account's `manage_data` storage on Stellar Testnet.
- `pnpm chain:attestation:verify`: Runs the complete end-to-end audit (signature, PDF hash, on-chain anchor, circulating supply, backing ratio) from the terminal.
  - Options:
    - `--deficit`: Simulates under-collateralized demo state ($85.00\%$).
    - `--tamper`: Simulates single-byte PDF corruption to verify tamper detection.

## Official References

- [Asset authorization flags](https://developers.stellar.org/docs/tokens/control-asset-access)
- [Clawbacks](https://developers.stellar.org/docs/build/guides/transactions/clawbacks)
- [Stellar Asset Contract](https://developers.stellar.org/docs/tokens/stellar-asset-contract)
- [Deploy a Stellar Asset Contract](https://developers.stellar.org/docs/tools/cli/cookbook/deploy-stellar-asset-contract)
- [Issue an asset](https://developers.stellar.org/docs/tokens/how-to-issue-an-asset)
- [SEP-1 Stellar info file](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md)
- [SARB Money Market Operations & Tender Results](https://www.resbank.co.za/en/home/what-we-do/financial-markets/south-african-money-market)
- [National Treasury Debt Management & Borrowing Strategy](http://www.treasury.gov.za/)

