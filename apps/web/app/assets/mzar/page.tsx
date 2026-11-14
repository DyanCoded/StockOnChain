import { formatMzarAsRand } from "../../lib/currency";

export const dynamic = "force-dynamic";

export default function MzarDisclosurePage() {
  const issuer = process.env.STELLAR_ANCHOR_SIM_PUBLIC_KEY;

  return (
    <main className="shell asset-disclosure">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>StockOnChain</span>
        </a>
        <span className="status">
          <span aria-hidden="true" />
          Testnet demo
        </span>
      </header>

      <section className="asset-heading" aria-labelledby="asset-title">
        <p className="asset-kicker">Asset transparency</p>
        <h1 id="asset-title">MOCK mZAR</h1>
        <p className="asset-lede">
          A Testnet-only demo token issued by the Anchor-sim account. It is not
          a real rand stablecoin, is not backed by fiat reserves, and cannot be
          redeemed for rand.
        </p>
      </section>

      <section className="asset-section" aria-labelledby="format-title">
        <h2 id="format-title">Rand display</h2>
        <p>
          Example only: 1 234.50 mZAR is displayed as{" "}
          <strong>{formatMzarAsRand(1234.5)}</strong>. This is a formatting
          example, not an account balance, peg, or redemption promise.
        </p>
        <dl className="asset-meta">
          <div>
            <dt>Network</dt>
            <dd>Stellar Testnet only</dd>
          </div>
          <div>
            <dt>Issuer</dt>
            <dd>{issuer ?? "Configure the Anchor-sim Testnet account"}</dd>
          </div>
          <div>
            <dt>Deposit flow</dt>
            <dd>Rate-limited demo faucet; not SEP-24</dd>
          </div>
        </dl>
      </section>

      <section className="asset-section" aria-labelledby="faucet-title">
        <h2 id="faucet-title">Testnet faucet</h2>
        <p>
          Set up the demo asset for your account, then request sample mZAR from
          the API. Each account may receive 100 MOCK mZAR once every 24 hours.
          Cooldown state is kept in a local file; the demo API must use one
          instance with persistent storage.
        </p>
        <p>
          The faucet is a demo convenience, not a deposit service, and accepts
          no real-world currency.
        </p>
      </section>

      <footer className="asset-footer">
        <a href="/">Back to StockOnChain</a>
        <a href="/assets">ZATBILL asset disclosure</a>
        <a href="/.well-known/stellar.toml">Stellar asset metadata</a>
      </footer>
    </main>
  );
}
