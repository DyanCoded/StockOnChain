export const dynamic = "force-dynamic";

const flags = [
  {
    name: "AUTH_REQUIRED",
    meaning:
      "A new holder needs issuer approval before the asset can be transferred. The ZATBILL demo leaves unapproved trustlines unable to use the token.",
  },
  {
    name: "AUTH_REVOCABLE",
    meaning:
      "The issuer can revoke a holder's authorization. That freezes transfers until the issuer authorizes the holder again.",
  },
  {
    name: "AUTH_CLAWBACK_ENABLED",
    meaning:
      "The issuer can claw back tokens from enabled trustlines. Clawback burns the tokens; it does not return them to an issuer balance. This flag requires AUTH_REVOCABLE.",
  },
  {
    name: "AUTH_IMMUTABLE",
    meaning:
      "Not enabled for this demo. It prevents the issuer from changing the authorization flags needed to demonstrate freezing and clawback.",
  },
];

export default function AssetTransparencyPage() {
  const issuer = process.env.STELLAR_ZATBILL_ISSUER_PUBLIC_KEY;
  const homeDomain = process.env.STELLAR_HOME_DOMAIN;

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
        <h1 id="asset-title">MOCK ZATBILL</h1>
        <p className="asset-lede">
          A Testnet-only mock claim used to demonstrate stokvel pot controls. It
          is not a security, a real T-bill, or backed by reserves.
        </p>
        <div className="asset-links">
          <a href="/.well-known/stellar.toml">Stellar asset metadata</a>
          <a href="/assets/zatbill-attestation.json">
            Non-attestation disclosure
          </a>
          {issuer ? (
            <a
              href={`https://stellar.expert/explorer/testnet/account/${issuer}`}
            >
              Testnet issuer account
            </a>
          ) : null}
        </div>
      </section>

      <section className="asset-section" aria-labelledby="value-title">
        <h2 id="value-title">Demo value</h2>
        <p>
          Demo materials model one ZATBILL as an illustrative R1.00 face-value
          claim at an example maturity, sold at a discount. No on-chain maturity
          schedule or fiat redemption is implemented. No real-world redemption
          or return is provided or guaranteed. Any payment to the issuer burns
          the returned classic asset; clawbacks also burn tokens.
        </p>
        <dl className="asset-meta">
          <div>
            <dt>Network</dt>
            <dd>Stellar Testnet</dd>
          </div>
          <div>
            <dt>Issuer</dt>
            <dd>{issuer ?? "Configure issuer in deployment environment"}</dd>
          </div>
          <div>
            <dt>Home domain</dt>
            <dd>
              {homeDomain ?? "Configure public HTTPS domain before setup"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="asset-section" aria-labelledby="flags-title">
        <h2 id="flags-title">Issuer controls</h2>
        <p className="asset-section-note">
          Flags are set before ZATBILL trustlines are created. They are
          account-level controls on the dedicated Testnet issuer.
        </p>
        <dl className="asset-flags">
          {flags.map((flag) => (
            <div key={flag.name}>
              <dt>
                <code>{flag.name}</code>
              </dt>
              <dd>{flag.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="asset-footer">
        <a href="/">Back to StockOnChain</a>
        <a href="https://github.com/DyanCoded/StockOnChain/blob/main/docs/ASSET.md">
          Full asset risk explainer
        </a>
      </footer>
    </main>
  );
}
