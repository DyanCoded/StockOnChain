import AdvancedWallet from "../components/advanced-wallet";

export default function AdvancedWalletPage({
  searchParams,
}: {
  searchParams: { lang?: string };
}) {
  const locale = searchParams.lang === "zu" ? "zu" : "en";

  return (
    <main className="shell wallet-page">
      <a href={locale === "zu" ? "/zu" : "/"}>
        {locale === "zu" ? "Buyela emuva" : "Back"}
      </a>
      <h1>
        {locale === "zu" ? "Ukuxhuma okuthuthukile" : "Advanced connection"}
      </h1>
      <p>
        {locale === "zu"
          ? "Le ndlela yokuzikhethela isebenzisa iStellar Testnet kuphela."
          : "This optional connection uses Stellar Testnet only."}
      </p>
      <AdvancedWallet locale={locale} />
    </main>
  );
}
