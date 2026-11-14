import PotContributeFlow from "../../components/pot-contribute-flow";

export default function PotContributePage({
  searchParams,
}: {
  searchParams: {
    lang?: string;
    pot?: string;
    verified?: string;
    state?: string;
  };
}) {
  const locale = searchParams.lang === "zu" ? "zu" : "en";
  const isVerified = searchParams.verified !== "false";
  const potState =
    searchParams.state === "Invested"
      ? "Invested"
      : searchParams.state === "Matured"
        ? "Matured"
        : "Open";

  return (
    <main
      className="shell"
      style={{ maxWidth: "600px", margin: "2rem auto", padding: "0 1rem" }}
    >
      <PotContributeFlow
        locale={locale}
        potName={searchParams.pot || "Family & Friends Stokvel"}
        initialState={{
          isVerified,
          potLifecycleState: potState,
          isWindowOpen: potState === "Open",
          walletBalanceMzar: 150,
          memberContributionMzar: 200,
          memberCapMzar: 300,
          remainingCapMzar: 100,
        }}
      />
      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <a
          href={locale === "zu" ? "/pot?lang=zu" : "/pot"}
          style={{ color: "#4b5563", fontSize: "0.9rem" }}
        >
          ← {locale === "zu" ? "Buyela Ephodweni" : "Back to Pot Dashboard"}
        </a>
      </div>
    </main>
  );
}
