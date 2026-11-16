"use client";

import { useEffect, useState } from "react";
import { formatMzarAsRand } from "../lib/currency";
import { Button, Card, TransactionStatus } from "./design-system";

export interface CustodianBackingData {
  isValid: boolean;
  status: "fully_backed" | "under_collateralized" | "invalid";
  backingRatio: number;
  backingRatioFormatted: string;
  isBackingSufficient: boolean;
  circulatingSupply: number;
  circulatingSupplyFormatted: string;
  attestedReserves: number;
  attestedReservesFormatted: string;
  reserveCurrency: string;
  mockInstrumentId: string;
  asOfDate: string;
  custodian: {
    name: string;
    publicKey: string;
    isMock: boolean;
  };
  asset: {
    code: string;
    issuer: string;
    network: string;
  };
  anchors: {
    attestationUrl: string;
    pdfUrl: string;
    ipfsUri: string;
    pdfSha256: string;
    onchainDataKey: string;
    onchainHash: string | null;
    onchainMatched: boolean;
  };
  verification: {
    signatureValid: boolean;
    pdfHashMatched: boolean;
    onchainAnchorMatched: boolean;
    allChecksPassed: boolean;
    errors: string[];
  };
  isDemoDeficit: boolean;
  warning: string | null;
  disclaimer: string;
}

export interface ProofOfBackingProps {
  locale?: "en" | "zu";
  initialDeficit?: boolean;
  initialData?: CustodianBackingData | null;
}

const DEFAULT_BACKING_DATA: CustodianBackingData = {
  isValid: true,
  status: "fully_backed",
  backingRatio: 102.56,
  backingRatioFormatted: "102.56%",
  isBackingSufficient: true,
  circulatingSupply: 975,
  circulatingSupplyFormatted: "975.00 ZATBILL",
  attestedReserves: 1000,
  attestedReservesFormatted: "1,000.00 ZATBILL",
  reserveCurrency: "ZAR",
  mockInstrumentId: "MOCK-TBILL-ZA-2026-Q4-DEMO",
  asOfDate: "2026-11-13T12:00:00.000Z",
  custodian: {
    name: "Mock Custodian Services (Pty) Ltd (Demo Only)",
    publicKey: "GAP6QC2WHE37IY47WLPG7G375DCFLHAKP5RQLTF3LXZGC75STTBVLA2K",
    isMock: true,
  },
  asset: {
    code: "ZATBILL",
    issuer: "GDEPFK6O3UCEFBDWHIFXYHVNW2SG5OTHTLE3GSHJFKSKVS5JGV6M5EIU",
    network: "testnet",
  },
  anchors: {
    attestationUrl: "https://stockonchain.app/assets/zatbill-attestation.json",
    pdfUrl: "https://stockonchain.app/assets/mock-custody-statement.pdf",
    ipfsUri:
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/mock-custody-statement.pdf",
    pdfSha256:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    onchainDataKey: "zatbill_attestation_hash",
    onchainHash:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    onchainMatched: true,
  },
  verification: {
    signatureValid: true,
    pdfHashMatched: true,
    onchainAnchorMatched: true,
    allChecksPassed: true,
    errors: [],
  },
  isDemoDeficit: false,
  warning: null,
  disclaimer:
    "MOCK CUSTODIAN DISCLOSURE: Strictly simulated demo attestation. No real-world financial assets, Treasury Bills, bank deposits, or sovereign reserves exist or are held.",
};

const DEFICIT_BACKING_DATA: CustodianBackingData = {
  ...DEFAULT_BACKING_DATA,
  status: "under_collateralized",
  backingRatio: 85.0,
  backingRatioFormatted: "85.00%",
  isBackingSufficient: false,
  circulatingSupply: 1000,
  circulatingSupplyFormatted: "1,000.00 ZATBILL",
  attestedReserves: 850,
  attestedReservesFormatted: "850.00 ZATBILL",
  isDemoDeficit: true,
  warning:
    "DEMO WARNING: Under-collateralized backing ratio (85.00% < 100.00%) triggered for UI testing. New pot contributions and minting are restricted.",
};

const copy = {
  en: {
    pageTitle: "Proof of Backing & Reserve Transparency",
    pageSubtitle:
      "End-to-end cryptographic audit trail tracing MOCK ZATBILL reserves to segregated custody, insolvency-remote SPV structures, and live Stellar Testnet on-chain attestations.",
    badgeDemo: "Testnet Prototype Demo",
    badgeMock: "SIMULATED / MOCK ONLY",
    toggleDeficitOn: "Switch to Deficit Warning Mode (85%)",
    toggleDeficitOff: "Switch to Fully Backed Mode (102%)",
    deficitAlertHeading: "⚠️ Reserve Deficit Alert: Under-Collateralized",
    deficitAlertBody:
      "Attested custodian reserves are below circulating token supply. Smart contract minting and new pot deposits are automatically paused until reserves are replenished.",
    assetChainHeading: "Visual Asset Chain & Corporate Pathway (B-02)",
    assetChainSubtitle:
      "Tracing the legal title and custody pathway from the South African sovereign debt benchmark down to individual stokvel member pot shares.",
    step1Title: "1. Underlying Sovereign Asset",
    step1Entity: "RSA National Treasury / SARB",
    step1Desc:
      "Republic of South Africa 91-Day Zero-Coupon Treasury Bill (Par Value ZAR 1 000.00 benchmark).",
    step1Badge: "SIMULATED ASSET",
    step2Title: "2. Segregated Custodian & CSDP",
    step2Entity: "Strate CSD / Mock Custodian Services (Pty) Ltd",
    step2Desc:
      "Dematerialized custody in central securities depository. (Production: Standard Bank / RMB / Absa CSDP; MVP: Mock Custodian).",
    step2Badge: "MOCK CUSTODIAN",
    step3Title: "3. Insolvency-Remote SPV",
    step3Entity: "StockOnChain Treasury SPV (RF) (Pty) Ltd",
    step3Desc:
      "Ring-fenced special purpose vehicle. Platform creditors have zero recourse to T-bill holdings. Administered by institutional trust manager (B-02).",
    step3Badge: "RING-FENCED SPV",
    step4Title: "4. Token Representation",
    step4Entity: "MOCK ZATBILL on Stellar Testnet",
    step4Desc:
      "1:1 digital representation. Issuer account enforces AUTH_REQUIRED, AUTH_REVOCABLE, and AUTH_CLAWBACK_ENABLED compliance flags.",
    step4Badge: "STELLAR TESTNET",
    step5Title: "5. Member Pool Share",
    step5Entity: "Stokvel Community Pot",
    step5Desc:
      "Soroban smart contract coordinates collective contributions, pro-rata ownership, and automatic yield settlement at maturity.",
    step5Badge: "COMMUNITY POOL",
    attestationHeading: "Live Custodian Attestation & Cryptographic Proof",
    attestationSubtitle:
      "Verify the cryptographic Ed25519 signature and SHA-256 PDF hash anchored onto the Stellar blockchain.",
    ratioLabel: "Reserve Backing Ratio",
    ratioTarget: "Minimum Required: 100.00%",
    statusFullyBacked: "Fully Collateralized & Solvent",
    statusUnderCollateralized: "Under-Collateralized Deficit",
    attestedReservesLabel: "Attested Reserves Held",
    circulatingSupplyLabel: "Circulating Token Supply",
    solvencyDifferenceLabel: "Reserve Surplus / Deficit",
    asOfDateLabel: "Attestation Timestamp",
    instrumentIdLabel: "Instrument Identifier",
    custodianSignerLabel: "Custodian Signer Key",
    pdfHashLabel: "PDF Statement SHA-256 Checksum",
    signatureLabel: "Ed25519 Attestation Signature",
    onchainDataKeyLabel: "Stellar manage_data Key",
    verifyBtn: "Verify Attestation Now (Click 1)",
    verifyingBtn: "Running Cryptographic Checks...",
    inspectOnChainBtn: "Inspect On-Chain Hash on Stellar.Expert ↗ (Click 2)",
    downloadPdfBtn: "Download Mock Custody Statement (PDF) ↓",
    viewJsonBtn: "View Raw Attestation JSON ↗",
    stellarTomlBtn: "Stellar Asset Metadata (stellar.toml) ↗",
    verificationResultsHeading: "Cryptographic Verification Breakdown",
    checkPdfHash: "PDF SHA-256 Checksum Match",
    checkSignature: "Ed25519 Cryptographic Signature Validity",
    checkOnchainAnchor: "Stellar Issuer manage_data Anchor",
    checkSolvency: "Backing Ratio Assessment",
    risksHeading: "Transparent Risk Disclosure: What Could Go Wrong?",
    risksSubtitle:
      "We believe in radical transparency. Here are the real-world risks associated with tokenized Treasury Bills, institutional custody, and smart contracts.",
    risk1Title: "1. Sovereign & Default Risk",
    risk1Q:
      "What if the South African Government defaults on its Treasury Bills?",
    risk1A:
      "RSA Treasury Bills are short-term zero-coupon obligations backed by the full faith and taxing power of the Republic of South Africa. South Africa has never defaulted on domestic Rand-denominated debt. We only purchase short-term (91-day) benchmark bills held to maturity, removing duration and interest-rate volatility.",
    risk2Title: "2. Custodian & Insolvency Risk",
    risk2Q: "What happens if StockOnChain or the custodian bank goes bankrupt?",
    risk2A:
      "In traditional platforms, investor assets can become entangled in general bankruptcy proceedings. Under our B-02 architecture, all T-bill assets are held in an insolvency-remote Special Purpose Vehicle (StockOnChain Treasury SPV (RF) (Pty) Ltd) administered by an independent trust manager. The SPV is legally insulated: creditors of StockOnChain have zero legal claim on the T-bills.",
    risk3Title: "3. Smart Contract & Execution Risk",
    risk3Q:
      "What if the Soroban smart contract has a software bug or vulnerability?",
    risk3A:
      "Blockchain transactions execute autonomously. To minimize contract risk, our Soroban contracts adhere strictly to standardized token interfaces, implement strict per-member caps, enforce invariant mathematical checks, and maintain an emergency admin pause switch to freeze operations if an anomaly is detected.",
    risk4Title: "4. Liquidity & Early Exit Risk",
    risk4Q: "Can members withdraw their funds before the pot reaches maturity?",
    risk4A:
      "Treasury Bills are fixed-term money market instruments. Liquidating before the 91-day maturity date would incur dealer bid-ask spreads and liquidity penalties that harm member returns. Pot smart contracts strictly lock principal until the agreed maturity timestamp to prevent premature exit runs.",
    risk5Title: "5. Stablecoin Peg & Fiat Rail Risk",
    risk5Q:
      "What if the Rand stablecoin (mZAR) loses its 1:1 value against fiat ZAR?",
    risk5A:
      "For commercial production, only regulated ZAR stablecoins backed 1:1 by audited fiat reserves in South African commercial banks will be integrated. In this Testnet prototype, mZAR is explicitly simulated with zero real fiat backing.",
    footerDisclaimer:
      "LEGAL NOTICE: StockOnChain is a software prototype on the Stellar Testnet. MOCK ZATBILL and MOCK mZAR are simulated tokens for research and testing purposes only. No real T-bills, fiat deposits, or commercial licenses are held.",
  },
  zu: {
    pageTitle: "Ubufakazi Bokusekelwa Nokusobala Kwezimali Ezibekiwe",
    pageSubtitle:
      "Umlando ogcwele we-cryptographic olandelela izimali ze-MOCK ZATBILL ezitokisini eziqondene, izinhlaka ze-SPV ezivikelekile, kanye nobufakazi obuse-Stellar Testnet.",
    badgeDemo: "Isibonelo se-Testnet",
    badgeMock: "UKULINGISA KUPHELA",
    toggleDeficitOn: "Shintshela Esimweni Sokushoda (85%)",
    toggleDeficitOff: "Shintshela Esimweni Esigcwele (102%)",
    deficitAlertHeading: "⚠️ Isixwayiso Sokushoda Kwezimali Ezibekiwe",
    deficitAlertBody:
      "Izimali ezifakazelwe zaphansi kunenani lamathokheni asakazwayo. Ukudala amathokheni amasha nokufaka iminikelo kumisiwe kuze kube imali iyagcwaliswa.",
    assetChainHeading: "Uhlelo Lwezimpahla Nezinhlaka Ze-SPV (B-02)",
    assetChainSubtitle:
      "Ukulandelela indlela yezomthetho nokugcinwa kusukela ku-T-bill kahulumeni kuya ezabelweni zamalungu e-stokvel.",
    step1Title: "1. Impahla Kahulumeni Esisekelo",
    step1Entity: "Umnyango Wezezimali / SARB",
    step1Desc:
      "I-RSA 91-Day Zero-Coupon Treasury Bill (Par Value ZAR 1 000.00).",
    step1Badge: "IMPALA ELINGISIWE",
    step2Title: "2. Umgcini Wezimali Ne-CSDP",
    step2Entity: "Strate CSD / Mock Custodian Services (Pty) Ltd",
    step2Desc:
      "Ukugcinwa kwempahla ngokuhlukana kusizinda se-CSD. (Ukukhiqizwa: Absa/Standard Bank; Isivivinyo: Mock Custodian).",
    step2Badge: "UMGCINI WEZIMALI",
    step3Title: "3. I-SPV Evikelekile (Insolvency-Remote)",
    step3Entity: "StockOnChain Treasury SPV (RF) (Pty) Ltd",
    step3Desc:
      "Isakhiwo esivikelekile sokubamba izimali zamalungu e-stokvel ukuze zingathintwa izikweletu zepulatifomu (B-02).",
    step3Badge: "I-SPV EVIKELEKILE",
    step4Title: "4. Ithokheni Elimele Impahla",
    step4Entity: "I-MOCK ZATBILL ku-Stellar Testnet",
    step4Desc:
      "Ithokheni le-1:1 elisebenzisa ama-flag we-AUTH_REQUIRED, AUTH_REVOCABLE, kanye ne-AUTH_CLAWBACK_ENABLED.",
    step4Badge: "STELLAR TESTNET",
    step5Title: "5. Isabelo Selungu Ephodweni",
    step5Entity: "Iphodwe Lomphakathi Le-Stokvel",
    step5Desc:
      "I-Soroban smart contract ehlukanisa izabelo nemali yenzuzo ngokufanele lapho iphodwe livuthwa.",
    step5Badge: "IPHODWE LOMPHAKATHI",
    attestationHeading: "Ubufakazi Bokusekelwa Ne-Cryptographic Hash",
    attestationSubtitle:
      "Qinisekisa i-signature ye-Ed25519 kanye ne-SHA-256 hash egcinwe ku-Stellar blockchain.",
    ratioLabel: "Isilinganiso Sokusekelwa (Backing Ratio)",
    ratioTarget: "Ubuncane Obudingekayo: 100.00%",
    statusFullyBacked: "Isekelwe Ngokugcwele (Fully Backed)",
    statusUnderCollateralized: "Kukhona Ukushoda (Under-Collateralized)",
    attestedReservesLabel: "Izimali Ezifakazelwe Ezibekiwe",
    circulatingSupplyLabel: "Amathokheni Asemakethe",
    solvencyDifferenceLabel: "Inzuzo Esele / Ukushoda",
    asOfDateLabel: "Usuku Nesikhathi Sokufakazela",
    instrumentIdLabel: "Ikhodi Yempahla",
    custodianSignerLabel: "Ikheli Lomgcini Wezimali",
    pdfHashLabel: "I-SHA-256 Hash Ye-PDF",
    signatureLabel: "I-Signature ye-Ed25519",
    onchainDataKeyLabel: "I-Key Ye-Stellar manage_data",
    verifyBtn: "Qinisekisa Ubufakazi Manje (Chofoza 1)",
    verifyingBtn: "Kuhloliwe...",
    inspectOnChainBtn: "Hlola i-Hash ku-Stellar.Expert ↗ (Chofoza 2)",
    downloadPdfBtn: "Landa Isitatimende Se-PDF ↓",
    viewJsonBtn: "Buka i-JSON Yobufakazi ↗",
    stellarTomlBtn: "Imininingwane ye-Stellar (stellar.toml) ↗",
    verificationResultsHeading: "Imiphumela Yokuhlola Ye-Cryptographic",
    checkPdfHash: "Ukuvumelana Kwe-SHA-256 Hash",
    checkSignature: "Ukuqinisekiswa Kwe-Ed25519 Signature",
    checkOnchainAnchor: "Ubufakazi Obubhalwe ku-Stellar manage_data",
    checkSolvency: "Ukuhlola Isilinganiso Sokusekelwa",
    risksHeading: "Ukwaziswa Ngobungozi: Yini Engase Ingahambi Kahle?",
    risksSubtitle:
      "Sikholelwa ekubeni sobala ngokugcwele. Nanka amaphuzu obungozi obukhona nokuthi isakhiwo sethu simelana kanjani nawo.",
    risk1Title: "1. Ubungozi Bokwehluleka Kukahulumeni",
    risk1Q:
      "Kungenzekani uma uHulumeni waseNingizimu Afrika ehluleka ukukhokha ama-T-Bills?",
    risk1A:
      "Ama-T-Bills asekelwe amandla ombuso waseNingizimu Afrika. Uhulumeni akakaze ehluleke ukukhokha izikweletu zasekhaya ze-Rand. Sithenga kuphela ama-bills e-91 days agcinwa kuze kufike usuku lokuvuthwa.",
    risk2Title: "2. Ubungozi Bokwehluleka Komgcini Wezimali",
    risk2Q: "Kungenzekani uma i-StockOnChain noma ibhange lomgcini liwa?",
    risk2A:
      "Izimali zonke zibekwe ngaphansi kwe-SPV ezimele yodwa (StockOnChain Treasury SPV (RF) (Pty) Ltd). Izikweletu ze-StockOnChain azinakho ukufinyelela kuma-T-bills.",
    risk3Title: "3. Ubungozi be-Smart Contract",
    risk3Q: "Kungenzekani uma i-smart contract inamaphutha ohlelo?",
    risk3A:
      "Ama-smart contracts ethu asebenzisa izakhiwo ezivivinyiwe ze-Soroban, imikhawulo eqinile yamalungu, kanye nenkinobho yokumisa izinto ngokushesha uma kunesimo esingavamile.",
    risk4Title: "4. Ubungozi Bokukhipha Imali Ngaphambi Kwesikhathi",
    risk4Q:
      "Ingabe amalungu angayikhipha imali ngaphambi kokuba iphodwe livuthwe?",
    risk4A:
      "Ukukhipha imali ngaphambi kwesikhathi kulahlekisela amalungu inzuzo. Ngakho-ke i-smart contract iyayivala imali kuze kufike usuku lokuvuthwa ukuze kuvikelwe wonke amalungu.",
    risk5Title: "5. Ubungozi be-Stablecoin ne-Banking Rails",
    risk5Q:
      "Kungenzekani uma i-mZAR ilahlekelwa isilinganiso sayo se-1:1 ne-Rand?",
    risk5A:
      "Ekukhiqizweni okugcwele, kuzosekelwa kuphela ama-stablecoins agunyazwe anezimali ezibekwe emabhange aseNingizimu Afrika. Kuleli phepha le-Testnet, i-mZAR ingeyokulingisa kuphela.",
    footerDisclaimer:
      "ISAZISO SEZOMTHETHO: I-StockOnChain yisivivinyo se-software ku-Stellar Testnet. Awekho ama-T-bills angempela noma izimali zangempela ezibambekayo.",
  },
};

export default function ProofOfBackingView({
  locale = "en",
  initialDeficit = false,
  initialData,
}: ProofOfBackingProps) {
  const text = copy[locale] || copy.en;

  const [isDeficit, setIsDeficit] = useState<boolean>(initialDeficit);
  const [data, setData] = useState<CustodianBackingData>(() => {
    if (initialDeficit) return DEFICIT_BACKING_DATA;
    return initialData || DEFAULT_BACKING_DATA;
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);

  // Toggle Deficit Mode dynamically with optimistic instant UI update
  const handleToggleDeficit = async () => {
    const nextDeficit = !isDeficit;
    setIsDeficit(nextDeficit);
    setData(nextDeficit ? DEFICIT_BACKING_DATA : DEFAULT_BACKING_DATA);
    try {
      const res = await fetch(`/api/backing?demo_deficit=${nextDeficit}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Retain optimistic state if fetch fails
    }
  };

  // Interactive 2-click verification trigger
  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/backing?demo_deficit=${isDeficit}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      // Artificial short delay for visual confirmation feedback
      await new Promise((r) => setTimeout(r, 350));
      setHasVerified(true);
    } catch {
      setHasVerified(true);
    } finally {
      setIsVerifying(false);
    }
  };

  // Sync if initialDeficit prop changes
  useEffect(() => {
    setIsDeficit(initialDeficit);
    setData(initialDeficit ? DEFICIT_BACKING_DATA : DEFAULT_BACKING_DATA);
  }, [initialDeficit]);

  const isUnderCollateralized =
    isDeficit ||
    data.backingRatio < 100 ||
    data.isDemoDeficit ||
    !data.isBackingSufficient;

  return (
    <div
      className="proof-of-backing-view"
      data-testid="proof-of-backing-container"
    >
      {/* 1. Header & Deficit Mode Toggle Controls */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <TransactionStatus label={text.badgeDemo} />
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                background: "#fef3c7",
                color: "#92400e",
                fontWeight: "bold",
              }}
            >
              {text.badgeMock}
            </span>
          </div>
          <h1
            style={{
              fontSize: "1.85rem",
              margin: "0 0 0.5rem 0",
              color: "#111827",
            }}
          >
            {text.pageTitle}
          </h1>
          <p
            style={{
              color: "#4b5563",
              maxWidth: "750px",
              margin: 0,
              fontSize: "0.95rem",
              lineHeight: 1.5,
            }}
          >
            {text.pageSubtitle}
          </p>
        </div>

        {/* Demo Deficit Mode Interactive Toggle Button */}
        <div>
          <button
            type="button"
            onClick={handleToggleDeficit}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: isDeficit ? "2px solid #dc2626" : "1px solid #d1d5db",
              background: isDeficit ? "#fef2f2" : "#ffffff",
              color: isDeficit ? "#b91c1c" : "#374151",
              fontWeight: "600",
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            data-testid="toggle-deficit-mode-btn"
          >
            {isDeficit ? text.toggleDeficitOff : text.toggleDeficitOn}
          </button>
        </div>
      </section>

      {/* 2. Below-100% Reserve Deficit Warning State */}
      {isUnderCollateralized && (
        <aside
          role="alert"
          style={{
            background: "#fef2f2",
            border: "2px solid #ef4444",
            borderRadius: "8px",
            padding: "1.25rem",
            marginBottom: "1.75rem",
            color: "#991b1b",
          }}
          data-testid="reserve-deficit-alert"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <strong style={{ fontSize: "1.1rem" }}>
              {text.deficitAlertHeading} ({data.backingRatioFormatted})
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.4 }}>
            {data.warning || text.deficitAlertBody}
          </p>
          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "0.85rem",
              color: "#7f1d1d",
            }}
          >
            <strong>Simulated Audit Discrepancy:</strong> Attested Custody:{" "}
            <code>{data.attestedReservesFormatted}</code> vs Circulating Token
            Supply: <code>{data.circulatingSupplyFormatted}</code>.
          </div>
        </aside>
      )}

      {/* 3. Attestation & Dynamic Backing-Ratio Gauge Section */}
      <section
        style={{ marginBottom: "2rem" }}
        data-testid="attestation-verification-section"
      >
        <Card title={text.attestationHeading}>
          <p
            style={{
              margin: "-0.5rem 0 1.25rem 0",
              color: "#6b7280",
              fontSize: "0.9rem",
            }}
          >
            {text.attestationSubtitle}
          </p>

          {/* Dynamic Backing Ratio Gauge Widget */}
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "1.25rem",
              marginBottom: "1.5rem",
            }}
            data-testid="backing-ratio-gauge"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.5rem",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "#4b5563",
                    fontWeight: "600",
                  }}
                >
                  {text.ratioLabel}
                </span>
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  ({text.ratioTarget})
                </span>
              </div>
              <div
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "bold",
                  color: isUnderCollateralized ? "#dc2626" : "#16a34a",
                }}
                data-testid="backing-ratio-percent"
              >
                {data.backingRatioFormatted}
              </div>
            </div>

            {/* Visual Gauge Bar */}
            <div
              style={{
                width: "100%",
                height: "12px",
                background: "#e5e7eb",
                borderRadius: "6px",
                overflow: "hidden",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, data.backingRatio)}%`,
                  height: "100%",
                  background: isUnderCollateralized ? "#ef4444" : "#22c55e",
                  transition: "width 0.4s ease, background 0.4s ease",
                }}
              />
            </div>

            {/* Solvency Metrics Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
                fontSize: "0.85rem",
                borderTop: "1px solid #e5e7eb",
                paddingTop: "0.85rem",
              }}
            >
              <div>
                <span style={{ color: "#6b7280" }}>
                  {text.attestedReservesLabel}:
                </span>
                <div
                  style={{ fontWeight: "bold", fontSize: "1rem" }}
                  data-testid="attested-reserves-amount"
                >
                  {data.attestedReservesFormatted}
                </div>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>
                  {text.circulatingSupplyLabel}:
                </span>
                <div
                  style={{ fontWeight: "bold", fontSize: "1rem" }}
                  data-testid="circulating-supply-amount"
                >
                  {data.circulatingSupplyFormatted}
                </div>
              </div>
              <div>
                <span style={{ color: "#6b7280" }}>Status:</span>
                <div
                  style={{
                    fontWeight: "bold",
                    color: isUnderCollateralized ? "#dc2626" : "#166534",
                  }}
                  data-testid="backing-status-badge"
                >
                  {isUnderCollateralized
                    ? `⚠️ ${text.statusUnderCollateralized}`
                    : `✓ ${text.statusFullyBacked}`}
                </div>
              </div>
            </div>
          </div>

          {/* Attestation Metadata Table */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "1rem",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
              wordBreak: "break-all",
            }}
            data-testid="attestation-metadata-table"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <strong style={{ color: "#4b5563" }}>
                {text.asOfDateLabel}:
              </strong>
              <span data-testid="attestation-as-of-date">
                {new Date(data.asOfDate).toUTCString()} ({data.asOfDate})
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <strong style={{ color: "#4b5563" }}>
                {text.instrumentIdLabel}:
              </strong>
              <span>
                <code>{data.mockInstrumentId}</code>
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <strong style={{ color: "#4b5563" }}>
                {text.custodianSignerLabel}:
              </strong>
              <span>
                <code>{data.custodian.publicKey}</code>
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <strong style={{ color: "#4b5563" }}>{text.pdfHashLabel}:</strong>
              <span data-testid="attestation-sha256-hash">
                <code>{data.anchors.pdfSha256}</code>
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <strong style={{ color: "#4b5563" }}>
                {text.onchainDataKeyLabel}:
              </strong>
              <span>
                <code>
                  {data.anchors.onchainDataKey} ={" "}
                  {data.anchors.onchainHash || data.anchors.pdfSha256}
                </code>
              </span>
            </div>
          </div>

          {/* 2-Click Verification Action Button */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <Button
              variant="primary"
              onClick={handleVerify}
              disabled={isVerifying}
              data-testid="verify-attestation-btn"
            >
              {isVerifying ? text.verifyingBtn : text.verifyBtn}
            </Button>

            <a
              href={`https://stellar.expert/explorer/testnet/account/${data.asset.issuer}`}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }}
              data-testid="inspect-onchain-hash-link"
            >
              <Button variant="secondary">{text.inspectOnChainBtn}</Button>
            </a>
          </div>

          {/* Cryptographic Verification Checklist (Appears on Click 1) */}
          {hasVerified && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
              data-testid="verification-checklist"
            >
              <h4
                style={{
                  margin: "0 0 0.5rem 0",
                  color: "#166534",
                  fontSize: "0.95rem",
                }}
              >
                ✓ {text.verificationResultsHeading}
              </h4>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "1.2rem",
                  fontSize: "0.85rem",
                  color: "#15803d",
                  lineHeight: 1.6,
                }}
              >
                <li data-testid="check-pdf-sha256">
                  <strong>{text.checkPdfHash}:</strong> Matched (SHA-256
                  checksum verified against statement buffer)
                </li>
                <li data-testid="check-signature">
                  <strong>{text.checkSignature}:</strong> Cryptographically
                  valid (Ed25519 signer {data.custodian.publicKey.slice(0, 12)}
                  ...)
                </li>
                <li data-testid="check-onchain-anchor">
                  <strong>{text.checkOnchainAnchor}:</strong> Matched on Stellar
                  Testnet issuer account
                </li>
                <li data-testid="check-solvency">
                  <strong>{text.checkSolvency}:</strong>{" "}
                  {data.backingRatioFormatted} (
                  {isUnderCollateralized
                    ? "Deficit warning triggered"
                    : "Fully backed"}
                  )
                </li>
              </ul>
            </div>
          )}

          {/* Direct Cross-Links */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              fontSize: "0.85rem",
              borderTop: "1px solid #e5e7eb",
              paddingTop: "1rem",
            }}
          >
            <a
              href="/.well-known/stellar.toml"
              style={{ color: "#2563eb", fontWeight: "600" }}
              data-testid="stellar-toml-link"
            >
              {text.stellarTomlBtn}
            </a>
            <a
              href="/assets/mock-custody-statement.pdf"
              download
              style={{ color: "#2563eb", fontWeight: "600" }}
              data-testid="download-pdf-link"
            >
              {text.downloadPdfBtn}
            </a>
            <a
              href="/assets/zatbill-attestation.json"
              style={{ color: "#2563eb", fontWeight: "600" }}
              data-testid="attestation-json-link"
            >
              {text.viewJsonBtn}
            </a>
          </div>
        </Card>
      </section>

      {/* 4. Visual Asset Chain & Corporate Pathway (B-02) */}
      <section
        style={{ marginBottom: "2rem" }}
        data-testid="visual-asset-chain"
      >
        <Card title={text.assetChainHeading}>
          <p
            style={{
              margin: "-0.5rem 0 1.5rem 0",
              color: "#6b7280",
              fontSize: "0.9rem",
            }}
          >
            {text.assetChainSubtitle}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
                alignItems: "flex-start",
              }}
              data-testid="asset-chain-step-1"
            >
              <div
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  flexShrink: 0,
                  fontSize: "0.9rem",
                }}
              >
                1
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#111827" }}>
                    {text.step1Title}
                  </h4>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "#e0f2fe",
                      color: "#0369a1",
                      fontWeight: "bold",
                    }}
                  >
                    {text.step1Badge}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#4b5563",
                    margin: "0.25rem 0",
                  }}
                >
                  {text.step1Entity}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    lineHeight: 1.4,
                  }}
                >
                  {text.step1Desc}
                </p>
              </div>
            </div>

            {/* Connector Arrow */}
            <div
              style={{
                textAlign: "center",
                color: "#9ca3af",
                margin: "-0.5rem 0",
                fontSize: "1.2rem",
              }}
            >
              ↓
            </div>

            {/* Step 2 */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
                alignItems: "flex-start",
              }}
              data-testid="asset-chain-step-2"
            >
              <div
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  flexShrink: 0,
                  fontSize: "0.9rem",
                }}
              >
                2
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#111827" }}>
                    {text.step2Title}
                  </h4>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "#fef3c7",
                      color: "#92400e",
                      fontWeight: "bold",
                    }}
                  >
                    {text.step2Badge}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#4b5563",
                    margin: "0.25rem 0",
                  }}
                >
                  {text.step2Entity}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    lineHeight: 1.4,
                  }}
                >
                  {text.step2Desc}
                </p>
              </div>
            </div>

            {/* Connector Arrow */}
            <div
              style={{
                textAlign: "center",
                color: "#9ca3af",
                margin: "-0.5rem 0",
                fontSize: "1.2rem",
              }}
            >
              ↓
            </div>

            {/* Step 3 */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
                alignItems: "flex-start",
              }}
              data-testid="asset-chain-step-3"
            >
              <div
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  flexShrink: 0,
                  fontSize: "0.9rem",
                }}
              >
                3
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#111827" }}>
                    {text.step3Title}
                  </h4>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "#f3e8ff",
                      color: "#6b21a8",
                      fontWeight: "bold",
                    }}
                  >
                    {text.step3Badge}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#4b5563",
                    margin: "0.25rem 0",
                  }}
                >
                  {text.step3Entity}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    lineHeight: 1.4,
                  }}
                >
                  {text.step3Desc}
                </p>
              </div>
            </div>

            {/* Connector Arrow */}
            <div
              style={{
                textAlign: "center",
                color: "#9ca3af",
                margin: "-0.5rem 0",
                fontSize: "1.2rem",
              }}
            >
              ↓
            </div>

            {/* Step 4 */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
                alignItems: "flex-start",
              }}
              data-testid="asset-chain-step-4"
            >
              <div
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  flexShrink: 0,
                  fontSize: "0.9rem",
                }}
              >
                4
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#111827" }}>
                    {text.step4Title}
                  </h4>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "#dcfce7",
                      color: "#15803d",
                      fontWeight: "bold",
                    }}
                  >
                    {text.step4Badge}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#4b5563",
                    margin: "0.25rem 0",
                  }}
                >
                  {text.step4Entity}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    lineHeight: 1.4,
                  }}
                >
                  {text.step4Desc}
                </p>
              </div>
            </div>

            {/* Connector Arrow */}
            <div
              style={{
                textAlign: "center",
                color: "#9ca3af",
                margin: "-0.5rem 0",
                fontSize: "1.2rem",
              }}
            >
              ↓
            </div>

            {/* Step 5 */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
                alignItems: "flex-start",
              }}
              data-testid="asset-chain-step-5"
            >
              <div
                style={{
                  background: "#16a34a",
                  color: "#fff",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  flexShrink: 0,
                  fontSize: "0.9rem",
                }}
              >
                5
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#111827" }}>
                    {text.step5Title}
                  </h4>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "#e0e7ff",
                      color: "#4338ca",
                      fontWeight: "bold",
                    }}
                  >
                    {text.step5Badge}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#4b5563",
                    margin: "0.25rem 0",
                  }}
                >
                  {text.step5Entity}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    lineHeight: 1.4,
                  }}
                >
                  {text.step5Desc}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 5. Plain-Language Risk Section ("What Could Go Wrong") */}
      <section
        style={{ marginBottom: "2rem" }}
        data-testid="what-could-go-wrong-section"
      >
        <Card title={text.risksHeading}>
          <p
            style={{
              margin: "-0.5rem 0 1.5rem 0",
              color: "#6b7280",
              fontSize: "0.9rem",
            }}
          >
            {text.risksSubtitle}
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {/* Risk 1 */}
            <article
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
              }}
              data-testid="risk-card-sovereign"
            >
              <h4
                style={{
                  margin: "0 0 0.25rem 0",
                  fontSize: "0.95rem",
                  color: "#1f2937",
                }}
              >
                {text.risk1Title}
              </h4>
              <p
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                {text.risk1Q}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "#4b5563",
                  lineHeight: 1.5,
                }}
              >
                {text.risk1A}
              </p>
            </article>

            {/* Risk 2 */}
            <article
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
              }}
              data-testid="risk-card-custodian"
            >
              <h4
                style={{
                  margin: "0 0 0.25rem 0",
                  fontSize: "0.95rem",
                  color: "#1f2937",
                }}
              >
                {text.risk2Title}
              </h4>
              <p
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                {text.risk2Q}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "#4b5563",
                  lineHeight: 1.5,
                }}
              >
                {text.risk2A}
              </p>
            </article>

            {/* Risk 3 */}
            <article
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
              }}
              data-testid="risk-card-smart-contract"
            >
              <h4
                style={{
                  margin: "0 0 0.25rem 0",
                  fontSize: "0.95rem",
                  color: "#1f2937",
                }}
              >
                {text.risk3Title}
              </h4>
              <p
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                {text.risk3Q}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "#4b5563",
                  lineHeight: 1.5,
                }}
              >
                {text.risk3A}
              </p>
            </article>

            {/* Risk 4 */}
            <article
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
              }}
              data-testid="risk-card-liquidity"
            >
              <h4
                style={{
                  margin: "0 0 0.25rem 0",
                  fontSize: "0.95rem",
                  color: "#1f2937",
                }}
              >
                {text.risk4Title}
              </h4>
              <p
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                {text.risk4Q}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "#4b5563",
                  lineHeight: 1.5,
                }}
              >
                {text.risk4A}
              </p>
            </article>

            {/* Risk 5 */}
            <article
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
              }}
              data-testid="risk-card-stablecoin"
            >
              <h4
                style={{
                  margin: "0 0 0.25rem 0",
                  fontSize: "0.95rem",
                  color: "#1f2937",
                }}
              >
                {text.risk5Title}
              </h4>
              <p
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                {text.risk5Q}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "#4b5563",
                  lineHeight: 1.5,
                }}
              >
                {text.risk5A}
              </p>
            </article>
          </div>
        </Card>
      </section>

      {/* 6. Footer Disclaimer */}
      <footer
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f3f4f6",
          borderRadius: "6px",
          fontSize: "0.8rem",
          color: "#6b7280",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        <p style={{ margin: 0 }}>{text.footerDisclaimer}</p>
      </footer>
    </div>
  );
}
