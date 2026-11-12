"use client";

import { useEffect, useState } from "react";

const copy = {
  en: {
    language: "Language",
    prototype: "Prototype",
    title: "StockOnChain",
    tagline: "A clearer view of your stokvel.",
    note: "No funds or investments are connected to this prototype.",
    assetInfo: "MOCK ZATBILL is a Testnet demo token with no real backing.",
    advanced: "Advanced",
    testnet: "Freighter connection is optional and limited to Stellar Testnet.",
    connect: "Connect Freighter",
    disconnect: "Disconnect",
    connecting: "Connecting...",
    connectError:
      "Could not connect. Check that Freighter is available and try again.",
  },
  zu: {
    language: "Ulimi",
    prototype: "Isivivinyo",
    title: "StockOnChain",
    tagline: "Bona kangcono iqembu lakho lokonga.",
    note: "Lesi sivivinyo asixhunyiwe emalini noma ekutshalweni kwezimali.",
    assetInfo:
      "I-MOCK ZATBILL iyithokheni yesivivinyo se-Testnet, ayisekelwe yizimpahla zangempela.",
    advanced: "Okuthuthukile",
    testnet:
      "Ukuxhuma kuFreighter akuphoqelekile futhi kusebenzisa iStellar Testnet kuphela.",
    connect: "Xhuma kuFreighter",
    disconnect: "Nqamula",
    connecting: "Iyaxhuma...",
    connectError:
      "Ayikwazanga ukuxhuma. Hlola ukuthi iFreighter iyatholakala yini bese uzama futhi.",
  },
} as const;

type Locale = keyof typeof copy;

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [address, setAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [kitInitialized, setKitInitialized] = useState(false);
  const text = copy[locale];

  async function connectFreighter() {
    setIsConnecting(true);
    setWalletError(null);
    try {
      const [sdk, wallet, types] = await Promise.all([
        import("@creit.tech/stellar-wallets-kit/sdk"),
        import("@creit.tech/stellar-wallets-kit/modules/freighter"),
        import("@creit.tech/stellar-wallets-kit/types"),
      ]);
      const activeKit = sdk.StellarWalletsKit;
      if (!kitInitialized) {
        activeKit.init({
          modules: [new wallet.VarialModule()],
          network: types.Networks.TESTNET,
        });
        setKitInitialized(true);
      }
      const { address: walletAddress } = await activeKit.authModal();
      setAddress(walletAddress);
    } catch {
      setWalletError(text.connectError);
    } finally {
      setIsConnecting(false);
    }
  }

  async function disconnectWallet() {
    try {
      const { StellarWalletsKit } =
        await import("@creit.tech/stellar-wallets-kit/sdk");
      await StellarWalletsKit.disconnect();
      setAddress(null);
    } catch {
      setWalletError(text.connectError);
    }
  }

  useEffect(() => {
    document.documentElement.lang = locale === "zu" ? "zu-ZA" : "en-ZA";
  }, [locale]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="StockOnChain home">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span className="font-bold">StockOnChain</span>
        </a>
        <label className="language-control">
          <span>{text.language}</span>
          <select
            aria-label={text.language}
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            <option value="en">English</option>
            <option value="zu">isiZulu</option>
          </select>
        </label>
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
          <details className="advanced-wallet">
            <summary>{text.advanced}</summary>
            <p>{text.testnet}</p>
            {address ? (
              <div className="wallet-status">
                <code>{address}</code>
                <button type="button" onClick={disconnectWallet}>
                  {text.disconnect}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={connectFreighter}
                disabled={isConnecting}
              >
                {isConnecting ? text.connecting : text.connect}
              </button>
            )}
            {walletError && <p role="alert">{walletError}</p>}
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
