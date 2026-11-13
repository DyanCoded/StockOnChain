# Smart Contract Deployments

This document tracks verified Soroban smart contract deployments on Stellar Testnet.

> **AI Guardrail Note (G6):** The smart contracts documented here are unaudited prototype contracts deployed strictly on Stellar Testnet. They carry no real-world financial backing or regulatory guarantees.

| Contract Name | Network | Contract ID | Deployed At | Compiler / Toolchain |
|---|---|---|---|---|
| **StokvelPot (T-04)** | Stellar Testnet | `CCCC3ERGNWEICYH377ABAHKGTHA2T5YD7K7ETCHGESQ3I7RSUSAFXQNB` | 2026-11-13T06:55:09.634Z | `stellar 30.0.1` / `soroban-sdk 29.0.1` |
| **ZATBILL SAC (T-01)** | Stellar Testnet | `CDALMH56TPGL37P4AIELC4FBISERZDRIJZIMIGRGCUNFPW7WLPS27GUR` | 2026-11-12 | Stellar Asset Contract (Protocol 22) |
| **mZAR SAC (B-02)** | Stellar Testnet | `CDH2DYZNE6K5P2EV6JAVTHVVNROLC6TIRWQNFF2OUMBNT36ZCTJPNXXX` | 2026-11-13 | Stellar Asset Contract (Protocol 22) |

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
