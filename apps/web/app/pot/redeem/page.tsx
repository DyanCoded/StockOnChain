import PotRedeemCashoutFlow from "../../components/pot-redeem-cashout-flow";

export default function PotRedeemPage({
  searchParams,
}: {
  searchParams: {
    lang?: string;
    pot?: string;
    state?: string;
    matured?: string;
  };
}) {
  const locale = searchParams.lang === "zu" ? "zu" : "en";
  const isMaturedParam = searchParams.matured !== "false";
  const potState =
    searchParams.state === "Invested" || !isMaturedParam
      ? "Invested"
      : "Matured";

  return (
    <main
      className="shell"
      style={{ maxWidth: "640px", margin: "2rem auto", padding: "0 1rem" }}
    >
      <PotRedeemCashoutFlow
        locale={locale}
        potName={searchParams.pot || "Cape Town Community Pot"}
        initialBreakdown={{
          potLifecycleState: potState,
          timeRemainingSeconds: potState === "Matured" ? 0 : 120,
          principalContributedMzar: 200,
          hasClaimed: false,
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
