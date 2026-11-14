"use client";

import { useEffect, useState } from "react";
import {
  COMPREHENSION_QUESTIONS,
  D01_GLOSSARY,
  evaluateRuleComprehension,
  joinStokvelPot,
  parsePotInviteToken,
  POT_RULES_ANCHORED_SUMMARY,
  type ComprehensionAnswers,
  type CreatedPotRecord,
  type JoinedPotResult,
} from "@stockonchain/chain/pot-create-join";
import { formatMzarAsRand } from "../lib/currency";
import {
  Button,
  Card,
  ErrorState,
  Stepper,
  Toast,
  TransactionStatus,
} from "./design-system";
import RiskExplainer from "./risk-explainer";

const joinCopy = {
  en: {
    language: "Language",
    pageTitle: "Join Stokvel Pot & Review Pool Rules",
    pageSubtitle:
      "Inspect the pot invitation, review the Pool Rules anchored in docs/POT_RULES.md and the D-01 Plain-Language Glossary, review the mandatory Risk Explainer, and confirm rule comprehension before joining on Stellar Testnet.",
    inviteCardTitle: "Stokvel Pot Invitation Summary",
    lifecycleHeading: "The 4 Lifecycle States (docs/POT_RULES.md)",
    lifecycleSteps: [
      {
        title: "1. Open",
        detail:
          "The pot is accepting contributions in MOCK mZAR from allowlisted Stokvel members up to the Per-Member Cap.",
        status: "Contributions open",
      },
      {
        title: "2. Invested",
        detail:
          "Pooled MOCK mZAR is swapped with the Dealer for discounted MOCK ZATBILL tokens. Funds are locked until Maturity.",
        status: "Locked until Maturity",
      },
      {
        title: "3. Matured",
        detail:
          "The agreed term duration has elapsed and the Soroban ledger timestamp has reached the Maturity date.",
        status: "Ready for settlement",
      },
      {
        title: "4. Settled",
        detail:
          "MOCK ZATBILL is redeemed at face value into the pot. Allowlisted members claim their pro-rata share once.",
        status: "Pro-rata claims open",
      },
    ],
    rulesHeading: "Plain-Language Pool Rules (Anchored in docs/POT_RULES.md)",
    rulesIntro:
      "Every Stokvel pot on StockOnChain enforces these smart-contract rules on Soroban Testnet:",
    glossaryHeading: "Plain-Language Glossary (Verified from D-01 Research)",
    glossaryIntro:
      "All terms on this page follow the exact definitions established in docs/RESEARCH.md (Guardrail G4):",
    riskGateHeading: "Mandatory Risk Explainer Review",
    riskCheckboxLabel:
      "I have reviewed the Risk Explainer component above and understand that this Stellar Testnet demo holds no real T-Bill, no connected Custodian, and no guaranteed Yield.",
    rulesCheckboxLabel:
      "I have reviewed the Pool Rules (anchored in docs/POT_RULES.md) including the Membership Allowlist, Per-Member Cap, and Maturity Timing Lock-Up.",
    comprehensionHeading:
      "Comprehension Check: Explain the Pool Rules Back (Non-Technical Verification)",
    comprehensionIntro:
      "Before joining, confirm your understanding of the three core Stokvel rules in plain language:",
    autofillComprehensionBtn: "Select Verified Plain-Language Answers",
    memberDetailsHeading: "Joining Member Profile (Synthetic Only — POPIA G7)",
    memberNameLabel: "Synthetic Member Display Name",
    memberAddressLabel: "Stellar Testnet Public Key",
    confirmJoinBtn: "Confirm & Join Stokvel Pot on Testnet",
    joiningBtn: "Recording Member on Stellar Testnet...",
    joinedSuccessBanner: "Member Joined & Allowlisted on Stellar Testnet",
    openPotDashboardLink: "Open Stokvel Pot Dashboard",
    createAnotherLink: "Create a New Pot",
    backHomeLink: "Back to home",
  },
  zu: {
    language: "Ulimi",
    pageTitle: "Joyina Iphodwe le-Stokvel & Buka Imithetho",
    pageSubtitle:
      "Hlola imemo yephodwe, funda Imithetho Yephodwe (docs/POT_RULES.md) kanye nesichazamazwi se-D-01, funda Isaziso Sobungozi (Risk Explainer), uqinisekise ukuqonda imithetho ngaphambi kokujoyina ku-Stellar Testnet.",
    inviteCardTitle: "Isifinyezo Sememo Yephodwe le-Stokvel",
    lifecycleHeading: "Izimo Ezi-4 Zokusebenza Kwephodwe (docs/POT_RULES.md)",
    lifecycleSteps: [
      {
        title: "1. Open (Kuvuliwe)",
        detail:
          "Iphodwe lamukela iminikelo ye-MOCK mZAR emalungwini avunyelwe kuze kufike kumkhawulo welungu (Cap).",
        status: "Iminikelo ivuliwe",
      },
      {
        title: "2. Invested (Kutshaliwe)",
        detail:
          "I-MOCK mZAR eqoqiwe ishintshwa ne-MOCK ZATBILL. Imali iyavalelwa kuze kufike usuku lokuvuthwa (Maturity).",
        status: "Kuvalelwe kuze kuvuthwe",
      },
      {
        title: "3. Matured (Kuvuthiwe)",
        detail:
          "Isikhathi esivumelwene ngaso sesiphelile futhi usuku lokuvuthwa selufikile.",
        status: "ikulungele ukukhokhwa",
      },
      {
        title: "4. Settled (Kukhokhiwe)",
        detail:
          "I-MOCK ZATBILL ibuyiselwa ngenani eligcwele. Amalungu afuna isabelo sawo se-pro-rata kanye.",
        status: "Ukufuna izabelo kuvuliwe",
      },
    ],
    rulesHeading: "Imithetho Yephodwe Ngolimi Olulula (docs/POT_RULES.md)",
    rulesIntro:
      "Wonke amaphodwe e-Stokvel ku-StockOnChain asebenzisa le mithetho ku-Soroban Testnet:",
    glossaryHeading: "Isichazamazwi Solimi Olulula (D-01 Research)",
    glossaryIntro:
      "Wonke amagama alandela izincazelo eziqinisekisiwe ku-docs/RESEARCH.md (G4):",
    riskGateHeading: "Ukubuyekezwa Okuphoqelekile kwe-Risk Explainer",
    riskCheckboxLabel:
      "Ngiyibuyekezile i-Risk Explainer ngenhla futhi ngiyaqonda ukuthi lesi sivivinyo se-Stellar Testnet asinayo i-T-Bill yangempela, umgcini, noma inzuzo eqinisekisiwe.",
    rulesCheckboxLabel:
      "Ngiyifundile Imithetho Yephodwe (docs/POT_RULES.md) ehlanganisa Uhlu Lwamalungu, Umkhawulo Welungu, Nesikhathi Sokuvuthwa.",
    comprehensionHeading:
      "Ukuhlolwa Kokuqonda: Chaza Imithetho Yephodwe Ngamazwi Akho",
    comprehensionIntro:
      "Ngaphambi kokujoyina, qinisekisa ukuthi uyayiqonda imithetho emithathu eyinhloko ye-Stokvel:",
    autofillComprehensionBtn: "Khetha Izimpendulo Eziqinisekisiwe",
    memberDetailsHeading: "Imininingwane Yelungu Elijoyinayo ( Yokulingisa )",
    memberNameLabel: "Igama Lelungu Lokulingisa",
    memberAddressLabel: "Ikheli le-Stellar Testnet",
    confirmJoinBtn: "Qinisekisa & Joyina Iphodwe ku-Testnet",
    joiningBtn: "Ibhalisa Ilungu ku-Stellar Testnet...",
    joinedSuccessBanner: "Ilungu Lijoyinile ku-Stellar Testnet",
    openPotDashboardLink: "Vula Ibhodi Lephodwe le-Stokvel",
    createAnotherLink: "Dala Elinye Iphodwe",
    backHomeLink: "Buyela ekhaya",
  },
} as const;

export default function PotJoinFlow({
  locale,
  inviteCode,
}: {
  locale: "en" | "zu";
  inviteCode?: string;
}) {
  const text = joinCopy[locale];
  const [pot, setPot] = useState<CreatedPotRecord>(() =>
    parsePotInviteToken(inviteCode),
  );
  const [memberDisplayName, setMemberDisplayName] = useState(
    "Zanele P. (Synthetic Member)",
  );
  const [memberAddress, setMemberAddress] = useState(
    "GE2W6C9Q9N6XY8A5Z7U0M1O2P5Q6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0",
  );
  const [hasReviewedRiskExplainer, setHasReviewedRiskExplainer] =
    useState(false);
  const [hasAcceptedPotRules, setHasAcceptedPotRules] = useState(false);
  const [answers, setAnswers] = useState<ComprehensionAnswers>({
    maturityLockup: "",
    yieldAndMockStatus: "",
    memberCapAndAllowlist: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [joinedResult, setJoinedResult] = useState<JoinedPotResult | null>(
    null,
  );

  useEffect(() => {
    if (inviteCode) {
      setPot(parsePotInviteToken(inviteCode));
      return;
    }
    try {
      const savedCode = sessionStorage.getItem(
        "stockonchain-latest-invite-code",
      );
      if (savedCode) {
        setPot(parsePotInviteToken(savedCode));
      }
    } catch {
      // Keep default pot
    }
  }, [inviteCode]);

  const comprehension = evaluateRuleComprehension(answers);
  const canConfirmJoin =
    hasReviewedRiskExplainer && hasAcceptedPotRules && comprehension.passed;

  function handleAutofillComprehension() {
    setAnswers({
      maturityLockup: "after_maturity_and_settlement",
      yieldAndMockStatus: "not_guaranteed_and_simulated_testnet",
      memberCapAndAllowlist: "allowlisted_members_and_cap_enforced",
    });
    setError(null);
  }

  async function handleJoinSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await joinStokvelPot({
        pot,
        memberDisplayName,
        memberAddress,
        hasReviewedRiskExplainer,
        hasAcceptedPotRules,
        comprehensionAnswers: answers,
      });
      setJoinedResult(result);
      setPot(result.pot);
      try {
        sessionStorage.setItem(
          "stockonchain-active-created-pot",
          JSON.stringify(result.pot),
        );
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not join Stokvel pot.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="shell pot-dashboard"
      data-pot-join-ready="true"
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
          <span className="status" data-testid="join-mode-badge">
            <span aria-hidden="true" />
            {pot.mode === "testnet"
              ? "LIVE TESTNET · Invitation (Mock Tokens)"
              : "MOCK MODE · Invitation"}
          </span>
          <details className="language-control">
            <summary>{text.language}</summary>
            <nav className="language-options" aria-label={text.language}>
              <a
                href={`/pot/join${inviteCode ? `?invite=${encodeURIComponent(inviteCode)}` : ""}`}
                lang="en-ZA"
                aria-current={locale === "en" ? "page" : undefined}
              >
                English
              </a>
              <a
                href={`/pot/join?lang=zu${inviteCode ? `&invite=${encodeURIComponent(inviteCode)}` : ""}`}
                lang="zu-ZA"
                aria-current={locale === "zu" ? "page" : undefined}
              >
                isiZulu
              </a>
            </nav>
          </details>
        </div>
      </header>

      <section className="pot-hero" aria-labelledby="pot-join-title">
        <p className="asset-kicker">{pot.potName}</p>
        <h1 id="pot-join-title">{text.pageTitle}</h1>
        <p className="pot-subtitle">{text.pageSubtitle}</p>
      </section>

      {/* 1. Pot Invitation Summary */}
      <section
        className="pot-section"
        aria-labelledby="invite-summary-heading"
        data-testid="invite-summary-section"
      >
        <h2 id="invite-summary-heading">{text.inviteCardTitle}</h2>
        <div className="pot-metrics-grid">
          <Card title="Stokvel & Treasurer">
            <p data-testid="join-pot-name">
              <strong>{pot.potName}</strong>
            </p>
            <p className="field-help" data-testid="join-pot-treasurer">
              Treasurer: {pot.treasurer.displayName} ({pot.treasurer.role})
            </p>
            <p className="field-help">
              Contract: <code>{pot.contractId.slice(0, 10)}…</code>
            </p>
          </Card>

          <Card title="Term Duration & Yield">
            <p data-testid="join-pot-term">{pot.termLabel}</p>
            <p className="field-help" data-testid="join-pot-yield">
              Indicative Yield: {pot.dealerQuote.annualizedYieldFormatted}
            </p>
            <p className="field-help">Asset: MOCK ZATBILL (Testnet only)</p>
          </Card>

          <Card title="Contribution & Cap Rules (ZAR)">
            <p data-testid="join-pot-monthly">
              Monthly: {formatMzarAsRand(pot.monthlyContributionRand)}
            </p>
            <p className="field-help" data-testid="join-pot-cap">
              Per-Member Cap: {formatMzarAsRand(pot.memberCapRand)}
            </p>
            <p className="field-help">
              Current Members: {pot.members.length} allowlisted
            </p>
          </Card>
        </div>
      </section>

      {/* 2. Pool Rules Summary Anchored in docs/POT_RULES.md */}
      <section
        className="pot-section"
        aria-labelledby="pot-rules-heading"
        data-testid="pot-rules-section"
      >
        <h2 id="pot-rules-heading">{text.rulesHeading}</h2>
        <p>{text.rulesIntro}</p>

        <h3 className="mt-4">{text.lifecycleHeading}</h3>
        <Stepper
          label="StokvelPot 4 lifecycle states"
          steps={text.lifecycleSteps}
        />

        <div className="pot-metrics-grid mt-4">
          {POT_RULES_ANCHORED_SUMMARY.map((rule) => (
            <Card
              key={rule.id}
              title={locale === "zu" ? rule.titleZu : rule.titleEn}
            >
              <p className="field-help">
                <code>{rule.ruleCode}</code>
              </p>
              <p>{locale === "zu" ? rule.summaryZu : rule.summaryEn}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 3. Plain-Language Glossary (D-01 Guardrail G4) */}
      <section
        className="pot-section"
        aria-labelledby="d01-glossary-heading"
        data-testid="d01-glossary-section"
      >
        <h2 id="d01-glossary-heading">{text.glossaryHeading}</h2>
        <p>{text.glossaryIntro}</p>
        <dl className="pot-holdings-grid mt-4">
          {D01_GLOSSARY.map((entry) => (
            <div
              key={entry.term}
              className="pot-holding-box"
              data-testid={`glossary-term-${entry.term.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <dt>{entry.term}</dt>
              <dd style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                {locale === "zu" ? entry.meaningZu : entry.meaningEn}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 4. Mandatory Risk Explainer Review */}
      <section
        className="pot-section"
        aria-labelledby="mandatory-risk-gate-heading"
        data-testid="join-risk-explainer-section"
      >
        <h2 id="mandatory-risk-gate-heading">{text.riskGateHeading}</h2>
        <RiskExplainer locale={locale} />

        <div className="onboarding-panel mt-4">
          <label className="consent-check" htmlFor="review-risk-explainer-cb">
            <input
              id="review-risk-explainer-cb"
              data-testid="review-risk-explainer-checkbox"
              type="checkbox"
              checked={hasReviewedRiskExplainer}
              onChange={(e) => setHasReviewedRiskExplainer(e.target.checked)}
            />
            <span>{text.riskCheckboxLabel}</span>
          </label>

          <label className="consent-check mt-2" htmlFor="accept-pot-rules-cb">
            <input
              id="accept-pot-rules-cb"
              data-testid="accept-pot-rules-checkbox"
              type="checkbox"
              checked={hasAcceptedPotRules}
              onChange={(e) => setHasAcceptedPotRules(e.target.checked)}
            />
            <span>{text.rulesCheckboxLabel}</span>
          </label>
        </div>
      </section>

      {/* 5. Non-Technical Comprehension Check ("Explain the Rules Back") */}
      <section
        className="pot-section"
        aria-labelledby="comprehension-check-heading"
        data-testid="comprehension-check-section"
      >
        <div className="pot-activity-header">
          <div>
            <h2 id="comprehension-check-heading">
              {text.comprehensionHeading}
            </h2>
            <p>{text.comprehensionIntro}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAutofillComprehension}
            data-testid="comprehension-autofill-btn"
          >
            {text.autofillComprehensionBtn}
          </Button>
        </div>

        <div className="pot-members-list mt-4">
          {COMPREHENSION_QUESTIONS.map((q) => (
            <fieldset
              key={q.id}
              className="pot-member-card"
              data-testid={`comprehension-question-${q.id}`}
            >
              <legend style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
                {locale === "zu" ? q.questionZu : q.questionEn}
              </legend>
              {q.options.map((opt) => (
                <label
                  key={opt.value}
                  className="consent-check mt-2"
                  style={{ display: "flex", alignItems: "flex-start" }}
                >
                  <input
                    type="radio"
                    name={`comprehension-${q.id}`}
                    value={opt.value}
                    checked={answers[q.id] === opt.value}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))
                    }
                    data-testid={`comprehension-q-${q.id}-${opt.value}`}
                  />
                  <span>{locale === "zu" ? opt.labelZu : opt.labelEn}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>

        <Toast
          title={`Rule Comprehension Score: ${comprehension.score} / ${comprehension.total}`}
          variant={comprehension.passed ? "info" : "warning"}
        >
          <span data-testid="comprehension-summary-status">
            {comprehension.explainedRulesBackSummary}
          </span>
        </Toast>
      </section>

      {/* 6. Final Join Confirmation */}
      <section
        className="pot-section"
        aria-labelledby="join-confirm-heading"
        data-testid="join-confirm-section"
      >
        <h2 id="join-confirm-heading">{text.memberDetailsHeading}</h2>

        {error && <ErrorState title="Cannot join pot yet">{error}</ErrorState>}

        <div className="onboarding-panel">
          <label className="onboarding-field" htmlFor="join-member-name">
            {text.memberNameLabel}
          </label>
          <input
            id="join-member-name"
            data-testid="join-member-name-input"
            className="onboarding-input"
            type="text"
            value={memberDisplayName}
            onChange={(e) => setMemberDisplayName(e.target.value)}
          />

          <label className="onboarding-field mt-2" htmlFor="join-member-addr">
            {text.memberAddressLabel}
          </label>
          <input
            id="join-member-addr"
            data-testid="join-member-address-input"
            className="onboarding-input"
            type="text"
            value={memberAddress}
            onChange={(e) => setMemberAddress(e.target.value)}
          />

          <div className="onboarding-actions mt-4">
            <Button
              type="button"
              disabled={!canConfirmJoin || submitting}
              onClick={() => void handleJoinSubmit()}
              data-testid="confirm-join-pot-btn"
            >
              {submitting ? text.joiningBtn : text.confirmJoinBtn}
            </Button>
          </div>
        </div>

        {joinedResult && (
          <div
            className="onboarding-panel mt-4"
            data-testid="join-pot-success-card"
          >
            <TransactionStatus label={text.joinedSuccessBanner} />
            <p className="mt-2">
              <strong>Joined Member:</strong>{" "}
              <span data-testid="joined-member-name">
                {joinedResult.joinedMember.displayName}
              </span>{" "}
              ({joinedResult.joinedMember.role})
            </p>
            <p className="field-help" data-testid="joined-comprehension-proof">
              {joinedResult.comprehension.explainedRulesBackSummary}
            </p>
            <p className="field-help">
              <a
                href={joinedResult.explorerUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="joined-pot-tx-link"
              >
                Inspect Allowlist Tx on Horizon Testnet (
                {joinedResult.joinTxHash.slice(0, 8)}…)
              </a>
            </p>

            <h3 className="mt-4">
              Updated Allowlisted Stokvel Members (
              {joinedResult.pot.members.length})
            </h3>
            <ul className="pot-members-list" data-testid="joined-member-roster">
              {joinedResult.pot.members.map((m) => (
                <li key={m.id} className="pot-member-card">
                  <strong>{m.displayName}</strong> —{" "}
                  <span className="pot-member-role">{m.role}</span>
                </li>
              ))}
            </ul>

            <div className="pot-toolbar mt-4">
              <a
                className="ui-button ui-button-primary"
                href={locale === "zu" ? "/pot?lang=zu" : "/pot"}
                data-testid="after-join-open-dashboard-link"
              >
                {text.openPotDashboardLink}
              </a>
            </div>
          </div>
        )}
      </section>

      <footer className="asset-footer">
        <a href={locale === "zu" ? "/zu" : "/"}>{text.backHomeLink}</a>
        <a href={locale === "zu" ? "/pot?lang=zu" : "/pot"}>
          {text.openPotDashboardLink}
        </a>
        <a href={locale === "zu" ? "/pot/create?lang=zu" : "/pot/create"}>
          {text.createAnotherLink}
        </a>
      </footer>
    </main>
  );
}
