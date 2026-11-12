# ADR-003: Asset and backing design

- Status: Accepted
- Date: 2026-11-12

## Plain-Language Explanation

This ADR defines the asset model for the mock rand demo. The product should feel like a rand-backed stablecoin in the UI, but it must remain clearly labelled as a demo asset and not claim to be a real, licensed, or live rand stablecoin.

The important design decision is that the demo is a mock token with a standard Stellar asset surface, but with transparent backing statements and a clear issuer split. This prevents confusion between the real network asset behavior and the product’s demo assumptions.

## Option Paths

### Option A: Use a real rand-like asset directly in the demo

Use a real or live rand-like token in the app as if it were the product asset.

Pros:
- Familiar and easy to explain if the asset already exists.
- Feels immediately “real” to a user.

Cons:
- Violates the requirement not to use a real rand stablecoin in the demo.
- Creates a compliance and trust problem if the app implies backing or reserve status it does not have.
- Makes the product difficult to explain accurately in a demo context.

### Option B: Use a single issuer for both ZATBILL and mZAR (not recommended)

Create both assets under one issuer account, using a single account-level permission model.

Pros:
- Simpler initial issuer setup.
- Easier to imagine in a minimal prototype.

Cons:
- Asset flags apply to the whole issuer account, so enabling `AUTH_REQUIRED` on the ZATBILL issuer would also constrain mZAR.
- That would lock all assets controlled by the same account behind the same access model.
- It makes the demo less flexible and does not align with the anchor-sim model we need.

### Option C: Use a separate Anchor-sim issuer for mZAR and a dedicated ZATBILL flow (recommended)

Create a dedicated mZAR issuer account for the mock stablecoin and keep ZATBILL distinct under its own asset logic and contract rules.

Pros:
- Keeps the stablecoin issuer pattern honest for the demo.
- Makes it clear which account is the mock “issuer” and which asset is the pot instrument.
- Keeps trustlines simple because the issuer account can maintain open trustlines for faucet and demo use.
- Lets the project avoid unintended lock-ups caused by account-level asset flags.

Cons:
- Requires more bookkeeping and a clean issuer split in the product architecture.
- Adds some account-model complexity compared with a single-asset demo.

### Price mechanics for mZAR and ZATBILL

The mZAR display/payment asset and the ZATBILL pot instrument have different price mechanics. These options compare how the pot instrument's value is represented; mZAR remains a separately labelled mock rand asset.

#### Option A: Fixed 1:1 mZAR value throughout

Represent each ZATBILL as worth 1 mZAR at all times, including before maturity.

Pros:
- Simple to explain and display.
- Avoids purchase-price calculations.

Cons:
- Does not represent a discount purchase or distinguish purchase price from maturity value.
- Can imply a stable value or backing that this demo does not provide.

#### Option B: Discount purchase with face-value redemption at maturity (recommended)

Sell ZATBILL below its stated face value and represent one ZATBILL as a 1 mZAR claim at maturity in the demo rules. The interface may show that mock amount as R1.00, but it is not a real-world redemption promise.

Pros:
- Separates the purchase price from the stated maturity claim.
- Matches the intended ZATBILL pot instrument and makes the discount mechanics visible.

Cons:
- Requires the app and contract to define maturity, rounding, eligibility, and settlement consistently.
- Must be labelled as a simulated claim, not a real T-bill, guaranteed yield, or evidence of backing.

#### Option C: Accruing-yield token

Represent value as increasing over time according to an accruing rate or index.

Pros:
- Can model time-dependent value without a single maturity payment event.
- May fit products that explicitly need a changing exchange rate.

Cons:
- Requires a rate source, accrual schedule, precision rules, and dispute handling.
- Risks implying a real or guaranteed return and adds unnecessary oracle and contract complexity to this demo.

## Recommendation

Use a separate issuer account for mZAR, with the Anchor-sim account acting as the stablecoin issuer in the demo. Keep ZATBILL as the discount instrument for the pot logic and mint it only to the dealer account. Use an explicit mock label in the UI and in `stellar.toml` rather than implying a live rand stablecoin.

The asset rules should be:

- Stellar classic asset amounts have fixed seven-decimal precision; `stellar.toml` can separately suggest display precision. The app may display rand amounts to 2 decimal places, but the rounding rule should be defined in the UI and backend contract logic.
- mZAR is the demo stablecoin; the UI always presents it as rand and the label should read “MOCK” or “mock rand” in metadata and UI.
- ZATBILL is a discounted claim instrument: 1 token claims R1.00 at maturity, sold at a discount, minted only to the dealer.

### Attestation and anchoring paths

#### Option A: Store an attestation hash in issuer `manage_data` (recommended integrity anchor)

Publish the SHA-256 digest of the custodian-signed attestation JSON in an issuer account data entry. Stellar's `manage_data` value is limited to 64 bytes, so a 32-byte SHA-256 digest fits. The hash lets a reader compare a retrieved document with the committed digest; it does not prove that the attestation is truthful or that the data entry is immutable. The issuer can modify or remove its data entry.

Pros:
- Provides an on-ledger, independently verifiable commitment to the exact document bytes.
- A 32-byte digest fits within the 64-byte value limit.

Cons:
- The ledger stores only the digest, not the full attestation.
- The entry is controlled by the account and can be changed or deleted; retain prior ledger evidence if an audit trail is needed.
- A matching digest verifies document integrity, not the truth of its contents or the signer's authority.

#### Option B: Pin the full attestation on IPFS through Pinata

Store the full signed document on IPFS and use Pinata as a pinning provider for availability.

Pros:
- Makes the full document addressable by content and avoids fitting the document into an on-ledger field.
- Can be retrieved from other IPFS providers when the content is available on the network.

Cons:
- Pinata is an external service; continued pinning and gateway availability are not guaranteed by Stellar.
- Availability depends on pinning or other nodes retaining the content.
- A separately published hash or content identifier is still needed wherever readers discover the document.

#### Option C: Publish a reference in `stellar.toml`

Use the issuer's Stellar info file to publish asset metadata and a URL for the attestation.

Pros:
- Uses Stellar's standard web-discovery format for issuer and asset information.
- Easy for clients and people to discover alongside token metadata.

Cons:
- The file and its URL are off-chain and can change over time.
- A reference alone does not cryptographically bind the retrieved document to a particular on-chain state.
- Hosting, HTTPS, and domain availability remain external dependencies.

The chosen combination is a custodian-signed JSON attestation, a SHA-256 digest recorded in issuer `manage_data`, and a discoverable URL in `stellar.toml`. IPFS is optional for hosting the full document, not a substitute for checking its digest. Neither the digest nor the metadata proves real-world reserves or the truth of the attestation.

## Decision

The final asset design is:

- mZAR is issued by the Anchor-sim account and acts as the mock rand stablecoin used in the demo.
- Simulated cash-outs return mZAR to its issuer, intentionally burning the returned mZAR; this is a demo supply-reduction step, not evidence that fiat was paid out. Open trustlines are kept available so the faucet stays simple.
- ZATBILL remains the pot token and is minted only to the dealer.
- One ZATBILL claim is worth R1.00 at maturity, consistent with a discount sale price structure.
- Returning ZATBILL to its issuer at maturity is the intended on-ledger redemption settlement and burns the returned claim token. Any corresponding mZAR payout is a separate simulated settlement action; the issuer cannot hold its own classic asset.
- The asset is labelled “MOCK” in the UI and in `stellar.toml`.
- Asset access flags remain account-level, and the project will not assume a single issuer can host two different access patterns without unintended consequences.
- The demo's attestation story is a custodian-signed JSON document whose SHA-256 digest is stored in the issuer account's `manage_data` field and whose URL is discoverable in `stellar.toml`; IPFS pinning remains optional. These references support integrity checking and discovery, not a claim of real backing.

## Sources

- Stellar asset model, precision, and issuer-burn behavior: https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/assets
- Asset access and flags: https://developers.stellar.org/docs/tokens/control-asset-access
- `manage_data` operation and 64-byte value limit: https://developers.stellar.org/docs/learn/fundamentals/transactions/list-of-operations#manage-data
- Publishing asset information and `stellar.toml`: https://developers.stellar.org/docs/tokens/publishing-asset-info
- SEP-1 Stellar info file specification: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md
- IPFS content identifiers and content addressing: https://docs.ipfs.tech/concepts/content-addressing/
- IPFS persistence, pinning, and third-party pinning services: https://docs.ipfs.tech/concepts/persistence/
- Pinata upload and gateway documentation: https://docs.pinata.cloud/
- Clawback and trustline flag operations: https://developers.stellar.org/docs/build/guides/transactions/clawbacks
