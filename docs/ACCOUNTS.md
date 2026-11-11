# Stellar Testnet Accounts

The bootstrap command generates role keypairs locally, funds new accounts with
Friendbot, creates the demo trustlines and MOCK assets, and deploys the hello
contract. It writes public keys here and stores secret keys only in the
git-ignored `.env` file.

Never commit `.env` or share secret keys with an AI tool. Use testnet accounts
only; the assets below are mock assets and have no real-world value.

The **Anchor-sim** account is a testnet-only simulated anchoring role. It is
not a real attestor, custodian, or proof of reserve, and is not authorized by
the Soroban pot contract.

<!-- BOOTSTRAP-ACCOUNTS:START -->
| Role | Public Key |
|---|---|
| Admin | `GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH` |
| Issuer | `GBJKWAAGQEWMTR6JHCBTYFNCCBNQYWE5M6UKN2ZP3SWJ5GEXA2CTUAHL` |
| Dealer | `GATM4LFVO4DYXGIKKAUYNHSVQ6M7FTS3FPZSMNWEGKB7Q6XNOMXIPYVR` |
| Custodian | `GAP6QC2WHE37IY47WLPG7G375DCFLHAKP5RQLTF3LXZGC75STTBVLA2K` |
| Sponsor | `GBURYH5MNA3O7YIT2OHYFIJ2DRTNFZ4AFWDUQ3BCMZISD5IWYMTTBIEN` |
| Anchor-sim | `GATQHV3NU6EQWLGSZ5X6VM4BEOGDBEQWUEZZ3AY7VPJZVJIR7UEZOG3H` |
<!-- BOOTSTRAP-ACCOUNTS:END -->

Both teammates confirmed they can fund testnet accounts and inspect accounts in
Stellar Laboratory. Share only public keys; each person must keep their own
secret keys private.

## Team setup

Both teammates confirmed they can fund testnet accounts and inspect accounts in
[Stellar Laboratory](https://lab.stellar.org/) by selecting Testnet and entering
a public key. Share only the public keys from this document. Each teammate
should keep their own secret keys in a private local `.env`; do not send secrets
through chat or commit them.

To fund a separate testnet account, generate a local identity and fund it using
the Stellar CLI:

```powershell
stellar keys generate teammate --fund --network testnet
```

The secret seed phrase is private. Store it securely and never share it with an
AI tool. Stellar Testnet accounts and assets can be reset and have no monetary
value.

## Verified references

- [Stellar networks and Friendbot](https://developers.stellar.org/docs/networks)
- [Deploying and invoking a contract on Testnet](https://developers.stellar.org/docs/build/smart-contracts/getting-started/deploy-to-testnet)
- [Stellar CLI reference](https://developers.stellar.org/docs/tools/cli/stellar-cli)
- [Stellar JavaScript SDK](https://github.com/stellar/js-stellar-sdk)
- [Soroban Rust SDK](https://github.com/stellar/rs-soroban-sdk)
