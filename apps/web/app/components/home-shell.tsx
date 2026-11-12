import AdvancedWallet from "./advanced-wallet";
import LocalePicker from "./locale-picker";

const copy = {
  en: {
    language: "Language",
    prototype: "Prototype",
    title: "StockOnChain",
    tagline: "A clearer view of your stokvel.",
    note: "No funds or investments are connected to this prototype.",
    assetInfo: "MOCK ZATBILL is a Testnet demo token with no real backing.",
    signIn: "Sign in (coming from I-01)",
    advanced: "Advanced",
    testnet: "Freighter connection is optional and limited to Stellar Testnet.",
  },
  zu: {
    language: "Ulimi",
    prototype: "Isivivinyo",
    title: "StockOnChain",
    tagline: "Bona kangcono iqembu lakho lokonga.",
    note: "Lesi sivivinyo asixhunyiwe emalini noma ekutshalweni kwezimali.",
    assetInfo:
      "I-MOCK ZATBILL iyithokheni yesivivinyo se-Testnet, ayisekelwe yizimpahla zangempela.",
    signIn: "Ngena ngemvume (kuvela ku-I-01)",
    advanced: "Okuthuthukile",
    testnet:
      "Ukuxhuma kuFreighter akuphoqelekile futhi kusebenzisa iStellar Testnet kuphela.",
  },
} as const;

export default function HomeShell({ locale }: { locale: "en" | "zu" }) {
  const text = copy[locale];

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="StockOnChain home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span className="font-bold">StockOnChain</span>
        </a>
        <LocalePicker locale={locale} label={text.language} />
      </header>

      <section className="welcome" aria-labelledby="page-title">
        <div className="welcome-copy">
          <span className="status">
            <span aria-hidden="true" />
            {text.prototype}
          </span>
          <h1 id="page-title">{text.title}</h1>
          <p className="tagline">{text.tagline}</p>
          <p className="disclaimer">{text.note}</p>
          <a className="asset-link" href="/assets">
            {text.assetInfo}
          </a>
          <div className="login-placeholder">
            <button type="button" disabled>
              {text.signIn}
            </button>
          </div>
          <details className="advanced-wallet">
            <summary>{text.advanced}</summary>
            <p>{text.testnet}</p>
            <AdvancedWallet locale={locale} />
          </details>
        </div>
        <div className="welcome-stamp" aria-hidden="true">
          <span>S</span>
          <span>SC</span>
        </div>
      </section>
    </main>
  );
}