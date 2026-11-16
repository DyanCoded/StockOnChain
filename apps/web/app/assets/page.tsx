import { EmptyState, TransactionStatus } from "../components/design-system";
import ProofOfBackingView from "../components/proof-of-backing";

export const dynamic = "force-dynamic";

const flags = [
  {
    name: "AUTH_REQUIRED",
    meaning:
      "A new holder needs issuer approval before receiving or transferring the asset. This demo leaves unapproved accounts unable to use the token.",
  },
  {
    name: "AUTH_REVOCABLE",
    meaning:
      "The issuer can revoke a holder's authorization. That freezes transfers until the issuer authorizes the holder again.",
  },
  {
    name: "AUTH_CLAWBACK_ENABLED",
    meaning:
      "The issuer can remove tokens from approved accounts. This burns the tokens; it does not return them to an issuer balance. This flag requires AUTH_REVOCABLE.",
  },
  {
    name: "AUTH_IMMUTABLE",
    meaning:
      "Not enabled for this demo. It prevents the issuer from changing the authorization flags needed to demonstrate freezing and clawback.",
  },
];

export default function AssetTransparencyPage({
  searchParams,
}: {
  searchParams: { lang?: string; demo_deficit?: string };
}) {
  const locale = searchParams?.lang === "zu" ? "zu" : "en";
  const isDeficit =
    searchParams?.demo_deficit === "true" || searchParams?.demo_deficit === "1";
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
        <TransactionStatus label="Testnet mock demo" />
        <nav className="asset-locale" aria-label="Language">
          <a
            href={isDeficit ? "/assets?demo_deficit=true" : "/assets"}
            lang="en-ZA"
            aria-current={locale === "en" ? "page" : undefined}
          >
            English
          </a>
          <a
            href={
              isDeficit
                ? "/assets?lang=zu&demo_deficit=true"
                : "/assets?lang=zu"
            }
            lang="zu-ZA"
            aria-current={locale === "zu" ? "page" : undefined}
          >
            isiZulu
          </a>
        </nav>
      </header>

      <ProofOfBackingView locale={locale} initialDeficit={isDeficit} />

      <section
        className="asset-section"
        aria-labelledby="flags-title"
        style={{ marginTop: "2rem" }}
      >
        <h2 id="flags-title">Issuer controls</h2>
        <p className="asset-section-note">
          Flags are set before ZATBILL accounts are authorized. They are
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

      <section className="asset-section" aria-labelledby="value-title">
        <h2 id="value-title">Demo value & Issuer Network</h2>
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
            <dd>
              {issuer ?? (
                <EmptyState title="No issuer configured">
                  No live issuer or backing partner is connected to this demo.
                </EmptyState>
              )}
            </dd>
          </div>
          <div>
            <dt>Home domain</dt>
            <dd>
              {homeDomain ?? "Configure public HTTPS domain before setup"}
            </dd>
          </div>
        </dl>
      </section>

      <footer className="asset-footer" style={{ marginTop: "2rem" }}>
        <a href="/">Back to StockOnChain</a>
        <a href="https://github.com/DyanCoded/StockOnChain/blob/main/docs/ASSET.md">
          Full asset risk explainer
        </a>
      </footer>
    </main>
  );
}
