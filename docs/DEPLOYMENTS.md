# Smart Contract Deployments

This document tracks verified Soroban smart contract deployments on Stellar Testnet.

> **AI Guardrail Note (G6):** The smart contracts documented here are unaudited prototype contracts deployed strictly on Stellar Testnet. They carry no real-world financial backing or regulatory guarantees.

| Contract Name | Network | Contract ID | Deployed At | Compiler / Toolchain |
|---|---|---|---|---|
| **StokvelPot (T-04 Standard)** | Stellar Testnet | `CCCC3ERGNWEICYH377ABAHKGTHA2T5YD7K7ETCHGESQ3I7RSUSAFXQNB` | 2026-11-13T06:55:09.634Z | `stellar 30.0.1` / `soroban-sdk 29.0.1` |
| **StokvelPot (T-05 Time-Compressed Demo)** | Stellar Testnet | `CD3KZIPIZLF2G4D66IJ4NP5MKL22DX4VKLZ4TH7WY7IIM43SKA7E5UCX` | 2026-11-13T11:27:50.000Z | `stellar 30.0.1` / `soroban-sdk 29.0.1` |
| **ZATBILL SAC (T-01)** | Stellar Testnet | `CDALMH56TPGL37P4AIELC4FBISERZDRIJZIMIGRGCUNFPW7WLPS27GUR` | 2026-11-12 | Stellar Asset Contract (Protocol 22) |
| **mZAR SAC (B-02)** | Stellar Testnet | `CDH2DYZNE6K5P2EV6JAVTHVVNROLC6TIRWQNFF2OUMBNT36ZCTJPNXXX` | 2026-11-13 | Stellar Asset Contract (Protocol 22) |

## Time-Compressed Demo Pot Lifecycle Verification (T-05)

- **Pot Contract:** `CD3KZIPIZLF2G4D66IJ4NP5MKL22DX4VKLZ4TH7WY7IIM43SKA7E5UCX`
- **Product:** Time-Compressed Demo Treasury Bill (`time compressed for demo`)
- **Term Duration:** 120 seconds
- **Init Tx:** [`24f6cb37...`](https://horizon-testnet.stellar.org/transactions/24f6cb37f690917d8e30164880e95fce16665db1c8f73ea79e60722aa3a8989e)
- **SAC Authorized Tx:** [`61c9d972...`](https://horizon-testnet.stellar.org/transactions/61c9d97209d1031aef36bf3e1994751c05def9e041464c2070f177069f984288)
- **Allowlist Additions:**
  - Sipho M.: [`2139e730...`](https://horizon-testnet.stellar.org/transactions/2139e7303d556af1ebe4260964806bcd6cdb8baf43b786e5ae2ee32732bee394)
  - Nomsa K.: [`99187be6...`](https://horizon-testnet.stellar.org/transactions/99187be66b8f5d7c501bedc1a3778c4805d34cc83f2b5e4ecedf560803febfbf)
  - Thabo D.: [`b584cabb...`](https://horizon-testnet.stellar.org/transactions/b584cabb025dbf887a1853c4c262cc6caf72ed64b3e967bf2f5c992be6c08ff4)
- **Member Contributions (R100 Total):**
  - Sipho M. (R50.00): [`264bdbcb...`](https://horizon-testnet.stellar.org/transactions/264bdbcb1cf54eb5ab50cc5ae5bad54fcea713853b27b81eaeb8d6e42fbac2e1)
  - Nomsa K. (R30.00): [`3d2dcae6...`](https://horizon-testnet.stellar.org/transactions/3d2dcae6113b39bb26dfc992b401353254c54766f79d9b77520e807dfedced67)
  - Thabo D. (R20.00): [`8ad7ba03...`](https://horizon-testnet.stellar.org/transactions/8ad7ba03a6e6bda9bb325cd71358f27ab11662b8f87330d5461efc3191070110)
- **Primary Dealer Investment Swap (Dual-Auth):** [`49e811b0...`](https://horizon-testnet.stellar.org/transactions/49e811b036e931bff2f63bd7fc7e8f18e63109e7c777c22360ee80b3ec3e8a20)
- **Dealer Face-Value Settlement (R102 Total):** [`9e114ce1...`](https://horizon-testnet.stellar.org/transactions/9e114ce12eb846c79e615531cbfe389e3b81a773477891926e9e0d66e47566b4)
- **Member Claims:**
  - Sipho M. (R51.00): [`f9fbc127...`](https://horizon-testnet.stellar.org/transactions/f9fbc12783e6426219fc26a392c28a1e8f07b34af67f9c2c51f129f53e1c48b8)
  - Nomsa K. (R30.60): [`8b039b90...`](https://horizon-testnet.stellar.org/transactions/8b039b906472eafa85f3707f90bfd5b3940e0f673ce077335ed01185872c5d67)
  - Thabo D. (R20.40): [`99498f5e...`](https://horizon-testnet.stellar.org/transactions/99498f5e16298807674376368dc4ffa3af101eec22634d4a7ba2c660bbef6599)
- **Reconciliation Invariant:** $\sum \text{claims} (\text{R102.00}) + \text{dust} (0\text{ stroops}) \equiv \text{Settlement Total} (\text{R102.00})$


## Contract Addresses & Role Bindings

- **StokvelPot Contract:** `CCCC3ERGNWEICYH377ABAHKGTHA2T5YD7K7ETCHGESQ3I7RSUSAFXQNB`
- **Admin Address:** `GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH`
- **Dealer Address:** `GATM4LFVO4DYXGIKKAUYNHSVQ6M7FTS3FPZSMNWEGKB7Q6XNOMXIPYVR`
- **mZAR Token (SAC):** `CDH2DYZNE6K5P2EV6JAVTHVVNROLC6TIRWQNFF2OUMBNT36ZCTJPNXXX`
- **ZATBILL Token (SAC):** `CDALMH56TPGL37P4AIELC4FBISERZDRIJZIMIGRGCUNFPW7WLPS27GUR`
- **Initial Term Duration:** `2592000` seconds (30 days)
- **Maturity Timestamp:** `1797144905` (Sun, 13 Dec 2026 06:55:05 GMT)
- **Member Contribution Cap:** `1000000000` stroops (100 mZAR)

## Verification Commands

To inspect the on-chain interface and status using the Stellar CLI:

```sh
stellar contract info interface --contract-id CCCC3ERGNWEICYH377ABAHKGTHA2T5YD7K7ETCHGESQ3I7RSUSAFXQNB --network testnet
stellar contract invoke --id CCCC3ERGNWEICYH377ABAHKGTHA2T5YD7K7ETCHGESQ3I7RSUSAFXQNB --network testnet -- get_state
stellar contract invoke --id CCCC3ERGNWEICYH377ABAHKGTHA2T5YD7K7ETCHGESQ3I7RSUSAFXQNB --network testnet -- version
```
