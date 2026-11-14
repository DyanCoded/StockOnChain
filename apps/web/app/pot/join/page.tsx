import PotJoinFlow from "../../components/pot-join-flow";

export default function PotJoinPage({
  searchParams,
}: {
  searchParams: {
    lang?: string;
    invite?: string;
  };
}) {
  const locale = searchParams.lang === "zu" ? "zu" : "en";
  const inviteCode =
    typeof searchParams.invite === "string" ? searchParams.invite : undefined;

  return <PotJoinFlow locale={locale} inviteCode={inviteCode} />;
}
