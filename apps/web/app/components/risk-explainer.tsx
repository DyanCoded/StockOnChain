import { Card, Stepper, Toast } from "./design-system";

const content = {
  en: {
    flowTitle: "Your rand to your share",
    flowIntro:
      "Illustrative model only. None of these real-world assets or services are connected to this Testnet demo.",
    flowLabel: "Illustrative asset flow",
    steps: [
      {
        title: "Your Rand",
        detail: "A contribution is represented by a mock digital balance.",
        status: "Simulated contribution",
      },
      {
        title: "Government T-Bill held by a custodian",
        detail:
          "A real bill and custodian are not connected to this demo; no backing is held here.",
        status: "Not connected",
      },
      {
        title: "Your share in the pot",
        detail:
          "The prototype shows a simulated share record, not ownership or a redemption claim.",
        status: "Testnet mock",
      },
    ],
    riskTitle: "Understand the risks",
    mockTitle: "Testnet and mock components",
    mockNotice:
      "This demo runs on Stellar Testnet. It has no real T-Bill, custodian, backing partner, fiat, or investment return.",
    risks: [
      {
        title: "Custodian and backing risk",
        detail:
          "A T-Bill is only as safe as the custodian and backing partners actually holding it. This demo has no such custody or backing.",
      },
      {
        title: "Access and maturity",
        detail:
          "Funds may be locked until a bill matures. This prototype does not implement a real maturity schedule or redemption.",
      },
      {
        title: "Yield is not guaranteed",
        detail:
          "Any yield figure is entirely indicative, may change, and is not guaranteed. This demo pays no real yield.",
      },
      {
        title: "Wallet and transaction mistakes",
        detail:
          "A transaction sent to the wrong address or lost/exposed wallet keys may be impossible to reverse or recover.",
      },
    ],
  },
  zu: {
    flowTitle: "Irandi lakho iye esabelweni sakho",
    flowIntro:
      "Lesi yisibonelo kuphela. Azikho izimpahla noma izinsizakalo zangempela ezixhunywe kulesi sivivinyo se-Testnet.",
    flowLabel: "Ukuhamba kwemali okuyisibonelo",
    steps: [
      {
        title: "Irandi lakho",
        detail: "Umnikelo umelelwa ibhalansi yedijithali eyisivivinyo.",
        status: "Umnikelo olingisiwe",
      },
      {
        title: "Ibhili kaHulumeni ephethwe umgcini",
        detail:
          "Ibhili nomgcini wangempela akuxhunyiwe kulesi sivivinyo; akukho siqinisekiso semali esigciniwe.",
        status: "Akuxhunyiwe",
      },
      {
        title: "Isabelo sakho eqoqweni",
        detail:
          "Uhlelo lubonisa irekhodi lesabelo esilingisiwe, hhayi ubunikazi noma isithembiso sokukhokhelwa.",
        status: "Isivivinyo se-Testnet",
      },
    ],
    riskTitle: "Qonda ubungozi",
    mockTitle: "I-Testnet nezingxenye eziyizivivinyo",
    mockNotice:
      "Lesi sivivinyo sisebenzisa iStellar Testnet. Asinayo i-T-Bill yangempela, umgcini, umlingani oqinisekisa imali, imali ye-fiat, noma inzuzo yokutshalwa kwezimali.",
    risks: [
      {
        title: "Ubungozi bomgcini nesiqinisekiso semali",
        detail:
          "Ukuphepha kwe-T-Bill kuncike kumgcini nakubalingani abayiphethe ngempela. Lesi sivivinyo asinakho lokho kugcinwa noma isiqinisekiso semali.",
      },
      {
        title: "Ukufinyelela nesikhathi sokuvuthwa",
        detail:
          "Imali ingase ikhiywe kuze kuvuthwe ibhili. Lesi sivivinyo asinaso isikhathi sangempela sokuvuthwa noma sokukhokha.",
      },
      {
        title: "Inzuzo ayiqinisekisiwe",
        detail:
          "Noma iyiphi inzuzo ekhonjiswayo iyisilinganiso kuphela, ingashintsha futhi ayiqinisekisiwe. Lesi sivivinyo asikhokhi inzuzo yangempela.",
      },
      {
        title: "Amaphutha esikhwama noma okwenziwe",
        detail:
          "Okwenziwe kuthunyelwe ekhelini elingalungile noma okhiye besikhwama abalahlekile/abadaluliwe kungase kungabuyiselwa noma kulungiswe.",
      },
    ],
  },
} as const;

export default function RiskExplainer({ locale }: { locale: "en" | "zu" }) {
  const text = content[locale];

  return (
    <>
      <section
        className="asset-section"
        aria-labelledby="asset-flow-title"
        lang={locale === "zu" ? "zu-ZA" : "en-ZA"}
      >
        <h2 id="asset-flow-title">{text.flowTitle}</h2>
        <p>{text.flowIntro}</p>
        <Stepper label={text.flowLabel} steps={text.steps} />
      </section>
      <section
        className="asset-section risk-explainer"
        aria-labelledby="risk-title"
        lang={locale === "zu" ? "zu-ZA" : "en-ZA"}
      >
        <h2 id="risk-title">{text.riskTitle}</h2>
        <Toast title={text.mockTitle}>{text.mockNotice}</Toast>
        <div className="risk-grid">
          {text.risks.map((risk) => (
            <Card title={risk.title} key={risk.title}>
              <p>{risk.detail}</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
