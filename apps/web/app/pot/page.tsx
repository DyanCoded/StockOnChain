import PotDashboard from "../components/pot-dashboard";
import type {
  PotDashboardMode,
  ProductTermKey,
} from "@stockonchain/chain/pot-dashboard";

export default function PotDashboardPage({
  searchParams,
}: {
  searchParams: {
    lang?: string;
    mode?: string;
    term?: string;
    activity?: string;
    state?: string;
  };
}) {
  const locale = searchParams.lang === "zu" ? "zu" : "en";
  const initialMode: PotDashboardMode =
    searchParams.mode === "testnet" ? "testnet" : "mock";
  const initialProductKey: ProductTermKey =
    searchParams.term === "standard" ? "standard91Day" : "demoTimeCompressed";
  const initialEmptyActivity = searchParams.activity === "empty";
  const initialLoading = searchParams.state === "loading";

  return (
    <PotDashboard
      locale={locale}
      initialMode={initialMode}
      initialProductKey={initialProductKey}
      initialEmptyActivity={initialEmptyActivity}
      initialLoading={initialLoading}
    />
  );
}
