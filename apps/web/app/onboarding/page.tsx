import OnboardingWizard from "../components/onboarding-wizard";

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: { lang?: string; contact?: string };
}) {
  const locale = searchParams.lang === "zu" ? "zu" : "en";
  const contactMethod = searchParams.contact === "phone" ? "phone" : "email";
  const startedFromLanding =
    searchParams.contact === "email" || searchParams.contact === "phone";
  return (
    <OnboardingWizard
      locale={locale}
      initialContactMethod={contactMethod}
      initialStep={startedFromLanding ? 2 : 1}
    />
  );
}
