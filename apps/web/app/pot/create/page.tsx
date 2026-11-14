import PotCreateWizard from "../../components/pot-create-wizard";

export default function PotCreatePage({
  searchParams,
}: {
  searchParams: {
    lang?: string;
  };
}) {
  const locale = searchParams.lang === "zu" ? "zu" : "en";

  return <PotCreateWizard locale={locale} />;
}
