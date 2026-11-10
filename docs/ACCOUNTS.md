# Stellar Accounts & Key Management

> [!CAUTION]
> **Never commit private/secret keys (`S...`) to version control.**
> Only public keys (`G...`) should be documented here. Keep all secret keys in your private `.env` file (which is excluded by `.gitignore`) or in the Stellar CLI keystore.

---

## Registered Ecosystem Accounts

| Role | Public Key (Address) | Testnet Balance | Explorer |
| :--- | :--- | :--- | :--- |
| **Admin** | `GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH` | 10,000 XLM | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH) |
| **Issuer** | `GBJKWAAGQEWMTR6JHCBTYFNCCBNQYWE5M6UKN2ZP3SWJ5GEXA2CTUAHL` | 10,000 XLM | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBJKWAAGQEWMTR6JHCBTYFNCCBNQYWE5M6UKN2ZP3SWJ5GEXA2CTUAHL) |
| **Dealer** | `GATM4LFVO4DYXGIKKAUYNHSVQ6M7FTS3FPZSMNWEGKB7Q6XNOMXIPYVR` | 10,000 XLM | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GATM4LFVO4DYXGIKKAUYNHSVQ6M7FTS3FPZSMNWEGKB7Q6XNOMXIPYVR) |
| **Custodian** | `GAP6QC2WHE37IY47WLPG7G375DCFLHAKP5RQLTF3LXZGC75STTBVLA2K` | 10,000 XLM | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GAP6QC2WHE37IY47WLPG7G375DCFLHAKP5RQLTF3LXZGC75STTBVLA2K) |
| **Sponsor** | `GBURYH5MNA3O7YIT2OHYFIJ2DRTNFZ4AFWDUQ3BCMZISD5IWYMTTBIEN` | 10,000 XLM | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBURYH5MNA3O7YIT2OHYFIJ2DRTNFZ4AFWDUQ3BCMZISD5IWYMTTBIEN) |

---

## Role Definitions & Responsibilities

### 1. Admin Account
* **Address:** `GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH`
* **Role:** Smart contract deployment, contract ownership, governance, role-assignment, and protocol parameter management.

### 2. Issuer Account
* **Address:** `GBJKWAAGQEWMTR6JHCBTYFNCCBNQYWE5M6UKN2ZP3SWJ5GEXA2CTUAHL`
* **Role:** Represents the corporate entity issuing the stock tokens. Authorized to mint, issue new share tranches, execute corporate actions, and burn redeemed shares.

### 3. Dealer Account (Broker-Dealer / Market Maker)
* **Address:** `GATM4LFVO4DYXGIKKAUYNHSVQ6M7FTS3FPZSMNWEGKB7Q6XNOMXIPYVR`
* **Role:** Facilitates secondary market trades, order-matching, liquidity provision, and trade settlement between approved market participants.

### 4. Custodian Account
* **Address:** `GAP6QC2WHE37IY47WLPG7G375DCFLHAKP5RQLTF3LXZGC75STTBVLA2K`
* **Role:** Safekeeping of underlying assets, fiat collateral, proof-of-reserve attestation, and escrow hold for tokenized stocks.

### 5. Sponsor Account
* **Address:** `GBURYH5MNA3O7YIT2OHYFIJ2DRTNFZ4AFWDUQ3BCMZISD5IWYMTTBIEN`
* **Role:** Fee-sponsorship (Soroban / Stellar fee bumping). Subsidizes network gas / transaction fees for end-users and investors to enable frictionless onboarding.

---

## CLI Keystore Configuration

To import any of these accounts into your local Stellar CLI keystore for quick command execution:

```powershell
stellar keys add admin
stellar keys add issuer
stellar keys add dealer
stellar keys add custodian
stellar keys add sponsor
```
*(Paste the respective private secret key when prompted).*
