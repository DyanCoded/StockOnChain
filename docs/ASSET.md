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

## Official References

- [Asset authorization flags](https://developers.stellar.org/docs/tokens/control-asset-access)
- [Clawbacks](https://developers.stellar.org/docs/build/guides/transactions/clawbacks)
- [Stellar Asset Contract](https://developers.stellar.org/docs/tokens/stellar-asset-contract)
- [Deploy a Stellar Asset Contract](https://developers.stellar.org/docs/tools/cli/cookbook/deploy-stellar-asset-contract)
- [Issue an asset](https://developers.stellar.org/docs/tokens/how-to-issue-an-asset)
- [SEP-1 Stellar info file](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md)
