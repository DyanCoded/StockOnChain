"use client";

import { useEffect, useState } from "react";
import {
  createStokvelPot,
  DEFAULT_SYNTHETIC_ROSTER,
  generatePotInvite,
  POT_TERM_OPTIONS,
  type CreatedPotRecord,
  type PotInvitationPackage,
  type PotTermKey,
  type PotWizardMemberInput,
} from "@stockonchain/chain/pot-create-join";
import type { PotDashboardMode } from "@stockonchain/chain/pot-dashboard";
import { formatMzarAsRand } from "../lib/currency";
import {
  Button,
  Card,
  ErrorState,
  Toast,
  TransactionStatus,
} from "./design-system";

const wizardCopy = {
  en: {
    language: "Language",
    pageTitle: "Create a Stokvel Pot",
    pageSubtitle:
      "Configure your group savings rules, term duration, monthly contribution, per-member cap, and member allowlist on Stellar Testnet.",
    mockBannerTitle: "Testnet Prototype & Mock Asset Notice",
    mockBannerBody:
      "This Stokvel pot operates on Stellar Testnet using simulated MOCK mZAR and MOCK ZATBILL tokens. No real money, T-Bill, or Custodian is connected.",
    steps: ["1. Term & Rules", "2. Treasurer & Members", "3. Share & Invite"],
    step1Title: "Step 1: Term Duration & Contribution Rules",
    potNameLabel: "Stokvel Pot Name (Synthetic)",
    termLabel: "Select Treasury Bill Term Duration",
    monthlyLabel: "Monthly Contribution Amount (ZAR)",
    capLabel: "Per-Member Contribution Cap (ZAR)",
    modeLabel: "Execution Environment",
    testnetMode: "Live Stellar Testnet",
    mockMode: "Mock Mode (Offline Safe)",
    nextToMembers: "Continue to Treasurer & Member List",
    step2Title: "Step 2: Treasurer Role & Member Allowlist",
    treasurerNoticeTitle: "Automatic Treasurer Assignment (D-01 Glossary)",
    treasurerNoticeBody:
      "Treasurer: A member who helps record contributions and share group updates. As the pot creator, you are automatically assigned to the Treasurer role (Soroban contract admin).",
    creatorNameLabel: "Creator / Treasurer Display Name (Synthetic)",
    rosterHeading: "Initial Allowlisted Stokvel Members",
    addSyntheticMemberBtn: "Add Synthetic Member (Zanele P.)",
    backBtn: "Back",
    createPotBtn: "Create Stokvel Pot on Testnet",
    creatingBtn: "Initializing Pot on Stellar Testnet...",
    step3Title: "Step 3: Pot Created — Share Invitation & WhatsApp Link",
    createdSuccessStatus: "Stokvel Pot Initialized on Stellar Testnet",
    directLinkHeading: "Direct Invitation Link",
    copyLinkBtn: "Copy Invitation Link",
    copiedStatus: "Invitation link copied to clipboard",
    openJoinBtn: "Open Join Screen with This Invite",
    whatsappHeading: "WhatsApp Messaging Integration",
    whatsappShareAnchor: "Share Invite via WhatsApp",
    whatsappPreviewBtn: "Send Simulated WhatsApp Invite (Sandbox)",
    whatsappPreviewTitle: "WhatsApp Sandbox Dispatch Preview",
    viewDashboardLink: "Go to Pot Dashboard",
    joinPageLink: "Join a Pot",
    backHomeLink: "Back to home",
  },
  zu: {
    language: "Ulimi",
    pageTitle: "Dala Iphodwe le-Stokvel",
    pageSubtitle:
      "Hlela imithetho yeqembu lakho lokonga, isikhathi sokuvuthwa, umnikelo wenyanga, umkhawulo welungu, nohlu lwamalungu ku-Stellar Testnet.",
    mockBannerTitle: "Isaziso Sesivivinyo Se-Testnet Nama-Mock Assets",
    mockBannerBody:
      "Leli phodwe le-Stokvel lisebenza ku-Stellar Testnet ngamathokheni e-MOCK mZAR ne-MOCK ZATBILL. Ayikho imali yangempela noma i-T-Bill exhunyiwe.",
    steps: [
      "1. Isikhathi Nemithetho",
      "2. UMgcinimafa Namalungu",
      "3. Yabelana Ngememo",
    ],
    step1Title: "Isinyathelo 1: Isikhathi Sokuvuthwa Nemithetho Yeminikelo",
    potNameLabel: "Igama Lephodwe le-Stokvel (Elokulingisa)",
    termLabel: "Khetha Isikhathi se-T-Bill (Term Duration)",
    monthlyLabel: "Umnikelo Wenyanga (ZAR)",
    capLabel: "Umkhawulo Welungu Ngamunye (ZAR)",
    modeLabel: "Indawo Yokusebenza",
    testnetMode: "I-Stellar Testnet Ebukhoma",
    mockMode: "Indlela Yokulingisa (Mock)",
    nextToMembers: "Qhubeka kuMgcinimafa Nohlu Lwamalungu",
    step2Title: "Isinyathelo 2: Indima YoMgcinimafa Nohlu Lwamalungu",
    treasurerNoticeTitle: "Ukubekwa KoMgcinimafa Ngokuzenzakalelayo (D-01)",
    treasurerNoticeBody:
      "UMgcinimafa (Treasurer): Ilungu elisiza ukuqopha iminikelo nokwabelana ngezibuyekezo zeqembu. Njengomsunguli wephodwe, ubekwa ngokuzenzakalelayo njengoMgcinimafa.",
    creatorNameLabel: "Igama LoMgcinimafa (Elokulingisa)",
    rosterHeading: "Amalungu e-Stokvel Avunyelwe",
    addSyntheticMemberBtn: "Engeza Ilungu Lokulingisa (Zanele P.)",
    backBtn: "Emuva",
    createPotBtn: "Dala Iphodwe ku-Testnet",
    creatingBtn: "Idala Iphodwe ku-Stellar Testnet...",
    step3Title: "Isinyathelo 3: Iphodwe Lidaliwe — Yabelana Ngememo",
    createdSuccessStatus: "Iphodwe le-Stokvel Lidaliwe ku-Stellar Testnet",
    directLinkHeading: "Isixhumanisi Sememo Esiqondile",
    copyLinkBtn: "Kopisha Isixhumanisi Sememo",
    copiedStatus: "Isixhumanisi sememo sikopishiwe",
    openJoinBtn: "Vula Isikrini Sokujoyina Ngalesi Sixhumanisi",
    whatsappHeading: "Ukuthumela Imemo nge-WhatsApp",
    whatsappShareAnchor: "Yabelana Ngememo ku-WhatsApp",
    whatsappPreviewBtn: "Thumela Imemo ye-WhatsApp Yokulingisa (Sandbox)",
    whatsappPreviewTitle: "Ukubuka Kuqala Kwememo ye-WhatsApp",
    viewDashboardLink: "Iya Ebhodini Lephodwe",
    joinPageLink: "Joyina Iphodwe",
    backHomeLink: "Buyela ekhaya",
  },
} as const;

const EXTRA_SYNTHETIC_MEMBER: PotWizardMemberInput = {
  id: "member-zanele",
  displayName: "Zanele P. (Synthetic Member)",
  address: "GE2W6C9Q9N6XY8A5Z7U0M1O2P5Q6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0",
  role: "Member",
  phoneSynthetic: "+27000000005",
  isCreator: false,
};

export default function PotCreateWizard({ locale }: { locale: "en" | "zu" }) {
  const text = wizardCopy[locale];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [potName, setPotName] = useState("Ubuntu Siyakhula Stokvel Pot");
  const [termKey, setTermKey] = useState<PotTermKey>("standard91Day");
  const [monthlyContributionRand, setMonthlyContributionRand] = useState(50);
  const [memberCapRand, setMemberCapRand] = useState(300);
  const [mode, setMode] = useState<PotDashboardMode>("testnet");
  const [creatorName, setCreatorName] = useState(
    "Nandi M. (Synthetic Treasurer)",
  );
  const [additionalMembers, setAdditionalMembers] = useState<
    PotWizardMemberInput[]
  >(() => DEFAULT_SYNTHETIC_ROSTER.slice(1));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdPot, setCreatedPot] = useState<CreatedPotRecord | null>(null);
  const [invitePkg, setInvitePkg] = useState<PotInvitationPackage | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [whatsappDispatched, setWhatsappDispatched] = useState(false);
  const [baseOrigin, setBaseOrigin] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      setBaseOrigin(window.location.origin);
    }
  }, []);

  function handleContinueToStep2() {
    if (!potName.trim()) {
      setError("Please enter a synthetic Stokvel pot name.");
      return;
    }
    if (
      !Number.isFinite(monthlyContributionRand) ||
      monthlyContributionRand <= 0
    ) {
      setError("Monthly contribution amount must be greater than R 0,00.");
      return;
    }
    if (
      !Number.isFinite(memberCapRand) ||
      memberCapRand < monthlyContributionRand
    ) {
      setError(
        "Per-member cap must be greater than or equal to the monthly contribution amount.",
      );
      return;
    }
    setError(null);
    setStep(2);
  }

  function handleAddZanele() {
    if (additionalMembers.some((m) => m.id === EXTRA_SYNTHETIC_MEMBER.id)) {
      return;
    }
    setAdditionalMembers((prev) => [...prev, EXTRA_SYNTHETIC_MEMBER]);
  }

  function handleRemoveMember(id: string) {
    setAdditionalMembers((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleCreatePot() {
    setSubmitting(true);
    setError(null);
    try {
      const pot = await createStokvelPot({
        potName,
        termKey,
        monthlyContributionRand,
        memberCapRand,
        creatorName,
        members: additionalMembers,
        mode,
      });
      const invite = generatePotInvite(pot, baseOrigin, locale);
      setCreatedPot(pot);
      setInvitePkg(invite);
      setStep(3);

      try {
        sessionStorage.setItem(
          "stockonchain-active-created-pot",
          JSON.stringify(pot),
        );
        sessionStorage.setItem(
          "stockonchain-latest-invite-code",
          invite.inviteCode,
        );
      } catch {
        // Ignore storage errors in restricted environments
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create Stokvel pot.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyInviteLink() {
    if (!invitePkg) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitePkg.directInviteUrl);
      }
      setCopiedLink(true);
    } catch {
      setCopiedLink(true);
    }
  }

  const selectedTermOption =
    POT_TERM_OPTIONS.find((t) => t.key === termKey) ?? POT_TERM_OPTIONS[0];

  return (
    <main
      className="shell pot-dashboard"
      data-pot-create-ready="true"
      lang={locale === "zu" ? "zu-ZA" : "en-ZA"}
    >
      <header className="topbar">
        <a
          className="brand"
          href={locale === "zu" ? "/zu" : "/"}
          aria-label="StockOnChain home"
        >
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>StockOnChain</span>
        </a>
        <div className="pot-topbar-controls">
          <span className="status" data-testid="create-wizard-step-badge">
            <span aria-hidden="true" />
            Step {step} of 3 ·{" "}
            {mode === "testnet" ? "LIVE TESTNET (Mock Tokens)" : "MOCK MODE"}
          </span>
          <details className="language-control">
            <summary>{text.language}</summary>
            <nav className="language-options" aria-label={text.language}>
              <a
                href="/pot/create"
                lang="en-ZA"
                aria-current={locale === "en" ? "page" : undefined}
              >
                English
              </a>
              <a
                href="/pot/create?lang=zu"
                lang="zu-ZA"
                aria-current={locale === "zu" ? "page" : undefined}
              >
                isiZulu
              </a>
            </nav>
          </details>
        </div>
      </header>

      <section className="pot-hero" aria-labelledby="pot-create-title">
        <p className="asset-kicker">A-03 · Stokvel Setup & Governance</p>
        <h1 id="pot-create-title">{text.pageTitle}</h1>
        <p className="pot-subtitle">{text.pageSubtitle}</p>

        <Toast title={text.mockBannerTitle} variant="warning">
          {text.mockBannerBody}
        </Toast>

        <nav className="onboarding-progress" aria-label="Pot creation steps">
          <ol>
            {text.steps.map((label, idx) => (
              <li
                key={label}
                aria-current={step === idx + 1 ? "step" : undefined}
              >
                <span aria-hidden="true">{idx + 1}</span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      {error && (
        <ErrorState title="Check pot setup details">{error}</ErrorState>
      )}

      {step === 1 && (
        <section
          className="pot-section"
          aria-labelledby="wizard-step-1-heading"
          data-testid="wizard-step-1"
        >
          <h2 id="wizard-step-1-heading">{text.step1Title}</h2>

          <div className="onboarding-panel">
            <label className="onboarding-field" htmlFor="pot-name-input">
              {text.potNameLabel}
            </label>
            <input
              id="pot-name-input"
              data-testid="pot-name-input"
              className="onboarding-input"
              type="text"
              value={potName}
              onChange={(e) => setPotName(e.target.value)}
            />

            <fieldset className="mt-4">
              <legend className="onboarding-field">{text.termLabel}</legend>
              <div className="pot-metrics-grid" role="radiogroup">
                {POT_TERM_OPTIONS.map((opt) => {
                  const active = termKey === opt.key;
                  return (
                    <label
                      key={opt.key}
                      className="pot-member-card"
                      data-testid={`term-option-${opt.key}`}
                      style={{
                        cursor: "pointer",
                        borderColor: active ? "var(--color-accent)" : undefined,
                      }}
                    >
                      <div className="pot-member-header">
                        <strong>
                          <input
                            type="radio"
                            name="pot-term-duration"
                            value={opt.key}
                            checked={active}
                            onChange={() => setTermKey(opt.key)}
                            style={{ marginRight: "0.5rem" }}
                          />
                          {locale === "zu" ? opt.labelZu : opt.labelEn}
                        </strong>
                      </div>
                      <p className="field-help">
                        {locale === "zu"
                          ? opt.descriptionZu
                          : opt.descriptionEn}
                      </p>
                      <p className="field-help">
                        <strong>Yield:</strong> {opt.indicativeRateFormatted}
                      </p>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="pot-metrics-grid mt-4">
              <div>
                <label
                  className="onboarding-field"
                  htmlFor="monthly-contribution-input"
                >
                  {text.monthlyLabel}:{" "}
                  <strong>{formatMzarAsRand(monthlyContributionRand)}</strong>
                </label>
                <input
                  id="monthly-contribution-input"
                  data-testid="monthly-contribution-input"
                  className="onboarding-input"
                  type="number"
                  min={10}
                  step={5}
                  value={monthlyContributionRand}
                  onChange={(e) =>
                    setMonthlyContributionRand(
                      Math.max(0, Number(e.target.value)),
                    )
                  }
                />
                <div className="pot-toolbar mt-2">
                  {[25, 50, 100].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={
                        monthlyContributionRand === preset
                          ? "primary"
                          : "secondary"
                      }
                      onClick={() => setMonthlyContributionRand(preset)}
                      data-testid={`preset-monthly-${preset}`}
                    >
                      {formatMzarAsRand(preset)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="onboarding-field" htmlFor="member-cap-input">
                  {text.capLabel}:{" "}
                  <strong>{formatMzarAsRand(memberCapRand)}</strong>
                </label>
                <input
                  id="member-cap-input"
                  data-testid="member-cap-input"
                  className="onboarding-input"
                  type="number"
                  min={monthlyContributionRand}
                  step={25}
                  value={memberCapRand}
                  onChange={(e) =>
                    setMemberCapRand(Math.max(0, Number(e.target.value)))
                  }
                />
                <div className="pot-toolbar mt-2">
                  {[100, 300, 500].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant={
                        memberCapRand === preset ? "primary" : "secondary"
                      }
                      onClick={() => setMemberCapRand(preset)}
                      data-testid={`preset-cap-${preset}`}
                    >
                      {formatMzarAsRand(preset)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <span className="onboarding-field">{text.modeLabel}</span>
              <div className="pot-toolbar">
                <Button
                  type="button"
                  variant={mode === "testnet" ? "primary" : "secondary"}
                  onClick={() => setMode("testnet")}
                  data-testid="wizard-mode-testnet"
                >
                  {text.testnetMode}
                </Button>
                <Button
                  type="button"
                  variant={mode === "mock" ? "primary" : "secondary"}
                  onClick={() => setMode("mock")}
                  data-testid="wizard-mode-mock"
                >
                  {text.mockMode}
                </Button>
              </div>
            </div>

            <div className="onboarding-actions mt-4">
              <Button
                type="button"
                onClick={handleContinueToStep2}
                data-testid="wizard-continue-step2-btn"
              >
                {text.nextToMembers}
              </Button>
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section
          className="pot-section"
          aria-labelledby="wizard-step-2-heading"
          data-testid="wizard-step-2"
        >
          <h2 id="wizard-step-2-heading">{text.step2Title}</h2>

          <Toast title={text.treasurerNoticeTitle}>
            {text.treasurerNoticeBody}
          </Toast>

          <div
            className="pot-member-card mt-4"
            data-testid="creator-treasurer-card"
          >
            <div className="pot-member-header">
              <div>
                <strong>{creatorName}</strong>
                <span
                  className="pot-member-role"
                  data-testid="creator-treasurer-role-badge"
                >
                  Treasurer (Auto-Assigned Creator)
                </span>
              </div>
              <span className="pot-member-amount">
                Cap: {formatMzarAsRand(memberCapRand)}
              </span>
            </div>
            <label
              className="onboarding-field mt-2"
              htmlFor="creator-name-input"
            >
              {text.creatorNameLabel}
            </label>
            <input
              id="creator-name-input"
              data-testid="creator-name-input"
              className="onboarding-input"
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
            />
            <p className="field-help">
              Testnet Admin Address:{" "}
              <code>{DEFAULT_SYNTHETIC_ROSTER[0].address}</code>
            </p>
          </div>

          <div className="pot-members-wrapper mt-4">
            <div className="pot-activity-header">
              <h3>
                {text.rosterHeading} ({additionalMembers.length + 1} total
                including Treasurer)
              </h3>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddZanele}
                data-testid="add-synthetic-member-btn"
              >
                {text.addSyntheticMemberBtn}
              </Button>
            </div>

            <div className="pot-members-list" data-testid="wizard-member-list">
              {additionalMembers.map((member) => (
                <article
                  key={member.id}
                  className="pot-member-card"
                  data-testid={`wizard-member-${member.id}`}
                >
                  <div className="pot-member-header">
                    <div>
                      <strong>{member.displayName}</strong>
                      <span className="pot-member-role">{member.role}</span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleRemoveMember(member.id)}
                      data-testid={`remove-member-${member.id}`}
                    >
                      Remove
                    </Button>
                  </div>
                  <p className="field-help">
                    Synthetic Testnet Address:{" "}
                    <code>{member.address.slice(0, 14)}…</code> · Monthly:{" "}
                    {formatMzarAsRand(monthlyContributionRand)} · Cap:{" "}
                    {formatMzarAsRand(memberCapRand)}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <Card title="Selected Term & Rule Summary">
            <p>
              <strong>Term:</strong>{" "}
              {locale === "zu"
                ? selectedTermOption.labelZu
                : selectedTermOption.labelEn}{" "}
              ({selectedTermOption.indicativeRateFormatted})
            </p>
            <p>
              <strong>Monthly Contribution:</strong>{" "}
              {formatMzarAsRand(monthlyContributionRand)} ·{" "}
              <strong>Per-Member Cap:</strong> {formatMzarAsRand(memberCapRand)}
            </p>
          </Card>

          <div className="onboarding-actions mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
              data-testid="wizard-back-step1-btn"
            >
              {text.backBtn}
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreatePot()}
              disabled={submitting}
              data-testid="wizard-create-pot-btn"
            >
              {submitting ? text.creatingBtn : text.createPotBtn}
            </Button>
          </div>
        </section>
      )}

      {step === 3 && createdPot && invitePkg && (
        <section
          className="pot-section"
          aria-labelledby="wizard-step-3-heading"
          data-testid="wizard-step-3"
        >
          <h2 id="wizard-step-3-heading">{text.step3Title}</h2>
          <TransactionStatus label={text.createdSuccessStatus} />

          <div
            className="pot-metrics-grid mt-4"
            data-testid="created-pot-summary"
          >
            <Card title="Pot & Treasurer">
              <p data-testid="created-pot-name">
                <strong>{createdPot.potName}</strong>
              </p>
              <p className="field-help" data-testid="created-pot-treasurer">
                Treasurer: {createdPot.treasurer.displayName} (
                {createdPot.treasurer.role})
              </p>
              <p className="field-help">
                Members allowlisted: {createdPot.members.length}
              </p>
            </Card>

            <Card title="Term & Contributions (ZAR)">
              <p data-testid="created-pot-term">{createdPot.termLabel}</p>
              <p className="field-help" data-testid="created-pot-monthly">
                Monthly: {formatMzarAsRand(createdPot.monthlyContributionRand)}
              </p>
              <p className="field-help" data-testid="created-pot-cap">
                Per-Member Cap: {formatMzarAsRand(createdPot.memberCapRand)}
              </p>
            </Card>

            <Card title="Stellar Testnet Contract">
              <p className="field-help">
                Contract: <code>{createdPot.contractId.slice(0, 12)}…</code>
              </p>
              <p className="field-help">
                Indicative Yield:{" "}
                {createdPot.dealerQuote.annualizedYieldFormatted}
              </p>
              <p className="field-help">
                <a
                  href={createdPot.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="created-pot-tx-link"
                >
                  Inspect Init Tx on Horizon Testnet (
                  {createdPot.initTxHash.slice(0, 8)}…)
                </a>
              </p>
            </Card>
          </div>

          <div
            className="onboarding-panel mt-4"
            data-testid="pot-sharing-section"
          >
            <h3>{text.directLinkHeading}</h3>
            <input
              type="text"
              readOnly
              className="onboarding-input"
              value={invitePkg.directInviteUrl}
              aria-label={text.directLinkHeading}
              data-testid="direct-invite-link-input"
            />
            <div className="pot-toolbar mt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleCopyInviteLink()}
                data-testid="copy-invite-link-btn"
              >
                {text.copyLinkBtn}
              </Button>
              <a
                className="ui-button ui-button-primary"
                href={`/pot/join?invite=${encodeURIComponent(invitePkg.inviteCode)}${locale === "zu" ? "&lang=zu" : ""}`}
                data-testid="open-join-flow-link"
              >
                {text.openJoinBtn}
              </a>
            </div>
            {copiedLink && (
              <p className="field-help" data-testid="copied-invite-status">
                {text.copiedStatus}
              </p>
            )}

            <h3 className="mt-4">{text.whatsappHeading}</h3>
            <div className="pot-toolbar mt-2">
              <a
                className="ui-button ui-button-secondary"
                href={invitePkg.whatsappShareUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="whatsapp-share-link"
              >
                {text.whatsappShareAnchor}
              </a>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setWhatsappDispatched(true)}
                data-testid="simulate-whatsapp-dispatch-btn"
              >
                {text.whatsappPreviewBtn}
              </Button>
            </div>

            {whatsappDispatched && (
              <div
                className="pot-member-card mt-4"
                data-testid="whatsapp-message-preview"
              >
                <strong>{text.whatsappPreviewTitle}</strong>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    marginTop: "0.5rem",
                  }}
                >
                  {invitePkg.whatsappMessageText}
                </pre>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="asset-footer">
        <a href={locale === "zu" ? "/zu" : "/"}>{text.backHomeLink}</a>
        <a href={locale === "zu" ? "/pot?lang=zu" : "/pot"}>
          {text.viewDashboardLink}
        </a>
        <a href={locale === "zu" ? "/pot/join?lang=zu" : "/pot/join"}>
          {text.joinPageLink}
        </a>
      </footer>
    </main>
  );
}
