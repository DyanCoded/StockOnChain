# StockOnChain Web Application

The app is a minimal Next.js App Router shell with TypeScript, Tailwind CSS, responsive design tokens, English/isiZulu text scaffolding, and a web app manifest. Its service worker only provides an offline navigation fallback; it does not cache API responses or account data.

## Local development

From the repository root:

```powershell
pnpm --filter web dev
```

The web package can also be checked with `pnpm --filter web build` and `pnpm --filter web lint`. Run `pnpm format` to format web source or `pnpm format:check` to verify it.

## Deployment status

Live demo: [https://stock-on-chain-gmu2.vercel.app/](https://stock-on-chain-gmu2.vercel.app/). Vercel preview deployments are enabled for pull requests with pps/web as the root directory. The dashboard is served as static HTML with local CSS and no remote fonts or imagery; the service worker only provides an offline navigation fallback. Android installation and Lighthouse scores should be audited on this live deployment.

## Scope and security

The default login must follow I-01 when that issue's contract is available. An Advanced section exposes only an optional Freighter/Varial address connection, fixed to Stellar Testnet; it does not sign or submit transactions. Stellar Wallets Kit 2.8.0 is MIT-licensed. Do not treat this shell as a financial service or use it to enter real personal or financial data.

## Accessibility status

axe-core 4.14 reported zero WCAG 2.0, 2.1, and 2.2 A/AA violations on the dashboard, transparency page, and Advanced wallet page in English and isiZulu at 360×800. Keyboard checks covered the language and Advanced disclosures, and the dashboard has no horizontal overflow at 360px. These automated checks do not replace testing with a screen reader.

The isiZulu copy is AI-drafted and still requires review by a fluent speaker. Comprehension testing has not been conducted. Before marking D-02 complete, ask non-technical participants to explain, in their own words, whether a real T-Bill/custodian is connected, when access to funds may be restricted, whether yield is guaranteed, whether an incorrect transaction or lost keys can be reversed, and what the Testnet/mock labels mean. Record whether each participant correctly identifies all five risks; do not coach before recording the first answer.
