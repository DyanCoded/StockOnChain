const copy = {
  en: {
    language: "Language",
    prototype: "Prototype",
    tagline: "A clearer view of your stokvel.",
    note: "No funds or investments are connected to this prototype.",
    assetInfo: "MOCK mZAR is a Testnet-only demo token with no real backing.",
    assetHref: "/assets/mzar",
    potLink:
      "Open Stokvel Pot Dashboard (ZAR balance, members, ZATBILL & activity)",
    potHref: "/pot",
    signupLabel: "Sign up or sign in with a sample contact",
    emailSample: "Email · member@example.test",
    phoneSample: "Mobile · +27000000000",
    signupButton: "Continue",
    advanced: "Advanced",
    testnet: "Freighter connection is optional and limited to Stellar Testnet.",
    connect: "Connect Freighter",
  },
  zu: {
    language: "Ulimi",
    prototype: "Isivivinyo",
    tagline: "Bona kangcono iqembu lakho lokonga.",
    note: "Lesi sivivinyo asixhunyiwe emalini noma ekutshalweni kwezimali.",
    assetInfo:
      "I-MOCK mZAR iyithokheni yesivivinyo se-Testnet, ayisekelwe yimali yangempela.",
    assetHref: "/assets/mzar",
    potLink:
      "Vula Ibhodi Lephodwe le-Stokvel (Ibhalansi ye-ZAR, amalungu ne-ZATBILL)",
    potHref: "/pot?lang=zu",
    signupLabel: "Bhalisa noma ungene ngemininingwane yesampula",
    emailSample: "I-imeyili · member@example.test",
    phoneSample: "Iselula · +27000000000",
    signupButton: "Qhubeka",
    advanced: "Okuthuthukile",
    testnet:
      "Ukuxhuma kuFreighter akuphoqelekile futhi kusebenzisa iStellar Testnet kuphela.",
    connect: "Xhuma kuFreighter",
  },
} as const;

export default function HomeShell({ locale }: { locale: "en" | "zu" }) {
  const text = copy[locale];
  const homeUrl = locale === "zu" ? "/zu" : "/";

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href={homeUrl} aria-label="StockOnChain home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span className="font-bold">StockOnChain</span>
        </a>
        <details className="language-control">
          <summary>{text.language}</summary>
          <nav className="language-options" aria-label={text.language}>
            <a
              href="/"
              lang="en-ZA"
              aria-current={locale === "en" ? "page" : undefined}
            >
              English
            </a>
            <a
              href="/zu"
              lang="zu-ZA"
              aria-current={locale === "zu" ? "page" : undefined}
            >
              isiZulu
            </a>
          </nav>
        </details>
      </header>

      <section className="welcome" aria-labelledby="page-title">
        <div className="welcome-copy">
          <span className="status">
            <span aria-hidden="true" />
            {text.prototype}
          </span>
          <h1 id="page-title">StockOnChain</h1>
          <p className="tagline">{text.tagline}</p>
          <p className="disclaimer">{text.note}</p>
          <a className="asset-link" href={text.assetHref}>
            {text.assetInfo}
          </a>
          <p className="mt-2">
            <a className="asset-link" href={text.potHref}>
              {text.potLink}
            </a>
          </p>
          <p className="mt-2">
            <a
              className="asset-link"
              href={locale === "zu" ? "/pot/create?lang=zu" : "/pot/create"}
            >
              {locale === "zu"
                ? "Dala Iphodwe le-Stokvel noma Joyina Iphodwe (A-03)"
                : "Create or Join a Stokvel Pot (Wizard, WhatsApp Invite & Rules)"}
            </a>
          </p>
          <form
            className="landing-signup"
            action="/onboarding"
            method="get"
            data-onboarding-form
          >
            {locale === "zu" && <input type="hidden" name="lang" value="zu" />}
            <fieldset>
              <legend>{text.signupLabel}</legend>
              <label>
                <input
                  type="radio"
                  name="contact"
                  value="email"
                  defaultChecked
                />
                {text.emailSample}
              </label>
              <label>
                <input type="radio" name="contact" value="phone" />
                {text.phoneSample}
              </label>
            </fieldset>
            <button type="submit">{text.signupButton}</button>
          </form>
          <details className="advanced-wallet">
            <summary>{text.advanced}</summary>
            <p>{text.testnet}</p>
            <a href={`/advanced-wallet${locale === "zu" ? "?lang=zu" : ""}`}>
              {text.connect}
            </a>
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
