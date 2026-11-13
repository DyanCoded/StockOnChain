# StockOnChain Web Application

The app is a minimal Next.js App Router shell with TypeScript, Tailwind CSS, responsive design tokens, English/isiZulu text scaffolding, and a web app manifest. Its service worker only provides an offline navigation fallback; it does not cache API responses or account data.

## Local development

From the repository root:

```powershell
pnpm --filter web dev
```

The web package can also be checked with `pnpm --filter web build` and `pnpm --filter web lint`. Run `pnpm format` to format web source or `pnpm format:check` to verify it.

## Deployment status

The web application is deployed on Vercel at [https://stock-on-chain-gmu2.vercel.app/](https://stock-on-chain-gmu2.vercel.app/). Vercel preview deployments are enabled for pull requests with `apps/web` as the root directory. Android installation and Lighthouse scores should be audited on this live deployment.

## Scope and security

The default login must follow I-01 when that issue's contract is available. An Advanced section exposes only an optional Freighter/Varial address connection, fixed to Stellar Testnet; it does not sign or submit transactions. Stellar Wallets Kit 2.8.0 is MIT-licensed. Do not treat this shell as a financial service or use it to enter real personal or financial data.
