"use client";

import { useEffect, useState } from "react";
import {
  registerChainReactHooks,
  usePotDashboard,
  type PotDashboardMode,
  type ProductTermKey,
} from "@stockonchain/chain/pot-dashboard";
import { formatMzarAsRand } from "../lib/currency";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Stepper,
  Toast,
  TransactionStatus,
} from "./design-system";

registerChainReactHooks({ useState, useEffect });

const dashboardCopy = {
  en: {
    language: "Language",
    pageTitle: "Stokvel Pot Dashboard",
    pageSubtitle:
      "Inspect pooled Rand contributions, tokenized MOCK ZATBILL holdings, maturity countdown, indicative yield, and on-chain activity.",
    mockNoticeTitle: "Prototype & Mock Asset Notice",
    modeControlLabel: "Data environment",
    mockModeBtn: "Mock Mode (Synthetic)",
    testnetModeBtn: "Live Stellar Testnet",
    refreshBtn: "Refresh data",
    summarySectionTitle: "Pot Summary & Contribution Progress",
    totalBalanceLabel: "Total Pot Balance (ZAR)",
    targetGoalLabel: "Group Contribution Target",
    lifecycleStateLabel: "Pot Lifecycle State",
    memberCapLabel: "Per-Member Cap",
    settlementEstimateLabel: "Expected Face-Value Maturity",
    progressLabel: "Real-Time Contribution Progress",
    simulateContribBtn: "Simulate +R 25,00 Member Contribution",
    membersTitle: "Stokvel Member List & Shares",
    memberColName: "Member (Synthetic)",
    memberColContributed: "Contributed (ZAR)",
    memberColCapProgress: "Cap Progress",
    memberColShare: "Pot Share",
    memberColPayout: "Indicative Payout (ZAR)",
    holdingsSectionTitle: "Asset Visual Representation (MOCK ZATBILL)",
    holdingsSectionIntro:
      "How pooled member Rand is represented by discounted MOCK ZATBILL tokens until maturity. Yield is indicative and never guaranteed.",
    termToggleStandard: "91-Day Standard T-Bill Benchmark",
    termToggleCompressed: "120s Time-Compressed Demo Bill",
    exactZatbillLabel: "Exact ZATBILL Held",
    indicativeYieldHeading: "Indicative Annualized Yield",
    maturityCountdownHeading: "Maturity Countdown",
    discountPriceHeading: "Dealer Discount Price",
    indicativeReturnHeading: "Indicative Maturity Gain",
    attestedReserveHeading: "Custodian Attested Backing",
    activitySectionTitle: "Event-Driven Activity Feed",
    activitySectionIntro:
      "Chronological record of member contributions, custodian reserve attestations, and dealer investment swaps.",
    showEmptyBtn: "Preview Empty State",
    showEventsBtn: "Show Activity Events",
    showLoadingBtn: "Preview Loading State",
    hideLoadingBtn: "Resume Feed",
    loadingLabel: "Synchronizing stokvel pot state and ledger events...",
    emptyTitle: "No pot activity recorded yet",
    emptyBody:
      "When members contribute mZAR or the pot swaps into MOCK ZATBILL, each event will appear here with its verification status.",
    viewTx: "Inspect on Horizon Testnet",
    backHome: "Back to home",
    onboardingLink: "Onboarding & Verification",
    transparencyLink: "Asset & Risk Disclosures",
  },
  zu: {
    language: "Ulimi",
    pageTitle: "Ibhodi Lephodwe le-Stokvel",
    pageSubtitle:
      "Hlola iminikelo yamaRandi eqoqiwe, ama-MOCK ZATBILL ephethwe, isikhathi sokuvuthwa, inzuzo elingisiwe, nemisebenzi yakamuva.",
    mockNoticeTitle: "Isaziso Sesivivinyo Nempahla Yokulingisa",
    modeControlLabel: "Indawo yedatha",
    mockModeBtn: "Indlela Yokulingisa (Mock)",
    testnetModeBtn: "I-Stellar Testnet Ebukhoma",
    refreshBtn: "Vuselela idatha",
    summarySectionTitle: "Isifinyezo Sephodwe Nenqubekela-phambili Yeminikelo",
    totalBalanceLabel: "Isamba Sebhalansi Yephodwe (ZAR)",
    targetGoalLabel: " Umgomo Weminikelo Yeqembu",
    lifecycleStateLabel: "Isimo Sephodwe",
    memberCapLabel: "Umkhawulo Welungu Ngamunye",
    settlementEstimateLabel: "Inani Elilindelekile Ekuvuthweni",
    progressLabel: "Inqubekela-phambili Yeminikelo Ngesikhathi Sangempela",
    simulateContribBtn: "Linganisa Umnikelo we-R 25,00",
    membersTitle: "Uhlu Lwamalungu e-Stokvel Nezabelo",
    memberColName: "Ilungu (Elokulingisa)",
    memberColContributed: "Umnikelo (ZAR)",
    memberColCapProgress: "Inqubekela-phambili Yomkhawulo",
    memberColShare: "Isabelo Sephodwe",
    memberColPayout: "Inkokhelo Elingisiwe (ZAR)",
    holdingsSectionTitle: "Ukubukeka Kwempahla Yephodwe (MOCK ZATBILL)",
    holdingsSectionIntro:
      "Indlela amaRandi eqembu amelelwa ngayo ngamathokheni e-MOCK ZATBILL kuze kufike isikhathi sokuvuthwa. Inzuzo iyisibonelo futhi ayiqinisekisiwe.",
    termToggleStandard: "I-T-Bill Yezinsuku ezingama-91",
    termToggleCompressed: "I-T-Bill Yesivivinyo (120s)",
    exactZatbillLabel: "Inani Eliqondile le-ZATBILL",
    indicativeYieldHeading: "Inzuzo Yonyaka Elingisiwe",
    maturityCountdownHeading: "Isikhathi Esisele Sokuvuthwa",
    discountPriceHeading: "Intengo Yesaphulelo",
    indicativeReturnHeading: "Inzuzo Elingisiwe Ekuvuthweni",
    attestedReserveHeading: "Isiqinisekiso Somgcini",
    activitySectionTitle: "Uhlu Lwemisebenzi Nokuthengiselana",
    activitySectionIntro:
      "Amarekhodi eminikelo yamalungu, ukuqinisekiswa komgcini, nokutshalwa kwe-MOCK ZATBILL.",
    showEmptyBtn: "Buka Isimo Esingenalutho",
    showEventsBtn: "Bonisa Imisebenzi",
    showLoadingBtn: "Buka Isimo Sokulayisha",
    hideLoadingBtn: "Buyisela Uhlu",
    loadingLabel: "Ihlola isimo sephodwe nemisebenzi ye-ledger...",
    emptyTitle: "Ayikho imisebenzi eqoshiwe okwamanje",
    emptyBody:
      "Lapho amalungu enikela noma iphodwe litshala ku-MOCK ZATBILL, imisebenzi izovela lapha.",
    viewTx: "Buka ku-Horizon Testnet",
    backHome: "Buyela ekhaya",
    onboardingLink: "Ukubhalisa Nokuqinisekisa",
    transparencyLink: "Imininingwane Yobungozi Nempahla",
  },
} as const;

export default function PotDashboard({
  locale,
  initialMode = "mock",
  initialProductKey = "demoTimeCompressed",
  initialEmptyActivity = false,
  initialLoading = false,
}: {
  locale: "en" | "zu";
  initialMode?: PotDashboardMode;
  initialProductKey?: ProductTermKey;
  initialEmptyActivity?: boolean;
  initialLoading?: boolean;
}) {
  const text = dashboardCopy[locale];
  const {
    data,
    loading,
    error,
    mode,
    productKey,
    isEmptyActivity,
    setMode,
    setProductKey,
    toggleEmptyActivity,
    simulateContribution,
    setLoadingState,
    refresh,
  } = usePotDashboard({
    initialMode,
    initialProductKey,
    initialEmptyActivity,
    initialLoading,
  });

  const narrativeSteps = [
    {
      title:
        locale === "zu"
          ? "1. Imali Yeqembu Eqoqiwe (Rand)"
          : "1. Pooled Group Rand",
      detail: `${formatMzarAsRand(data.totalBalanceMzar)} pooled across ${data.members.length} synthetic stokvel members.`,
      status:
        data.mode === "testnet"
          ? "Testnet mZAR record"
          : "Simulated mZAR balance",
    },
    {
      title:
        locale === "zu"
          ? "2. Ukubanjwa kwe-MOCK ZATBILL"
          : "2. Discounted MOCK ZATBILL Holdings",
      detail: `${data.holdings.zatbillHeldFormatted} held at ${data.holdings.indicativeYieldLabel}.`,
      status: data.holdings.productLabel,
    },
    {
      title:
        locale === "zu"
          ? "3. Inani Ekuvuthweni (Face Value)"
          : "3. Maturity Face-Value Target",
      detail: `${formatMzarAsRand(data.holdings.totalFaceValueMzar)} total face value (${formatMzarAsRand(data.holdings.indicativeProfitMzar)} indicative discount return).`,
      status: data.holdings.countdown.formatted,
    },
  ];

  return (
    <main className="shell pot-dashboard" data-pot-dashboard-ready="true">
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
          <span className="status" data-testid="mode-indicator-badge">
            <span aria-hidden="true" />
            {data.modeBadgeLabel}
          </span>
          <details className="language-control">
            <summary>{text.language}</summary>
            <nav className="language-options" aria-label={text.language}>
              <a
                href="/pot"
                lang="en-ZA"
                aria-current={locale === "en" ? "page" : undefined}
              >
                English
              </a>
              <a
                href="/pot?lang=zu"
                lang="zu-ZA"
                aria-current={locale === "zu" ? "page" : undefined}
              >
                isiZulu
              </a>
            </nav>
          </details>
        </div>
      </header>

      <section className="pot-hero" aria-labelledby="pot-dashboard-title">
        <p className="asset-kicker">{data.potName}</p>
        <h1 id="pot-dashboard-title">{text.pageTitle}</h1>
        <p className="pot-subtitle">{text.pageSubtitle}</p>

        <Toast title={text.mockNoticeTitle} variant="warning">
          {data.modeDescription} {data.holdings.disclaimer}
        </Toast>

        <div
          className="pot-toolbar"
          role="group"
          aria-label={text.modeControlLabel}
        >
          <Button
            type="button"
            variant={mode === "mock" ? "primary" : "secondary"}
            onClick={() => void setMode("mock")}
            data-testid="mode-mock-btn"
          >
            {text.mockModeBtn}
          </Button>
          <Button
            type="button"
            variant={mode === "testnet" ? "primary" : "secondary"}
            onClick={() => void setMode("testnet")}
            data-testid="mode-testnet-btn"
          >
            {text.testnetModeBtn}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refresh()}
            data-testid="refresh-dashboard-btn"
          >
            {text.refreshBtn}
          </Button>
        </div>
      </section>

      {error && (
        <ErrorState title="Could not refresh Testnet state">{error}</ErrorState>
      )}

      {/* Section 1: Pot Summary & Progress */}
      <section
        className="pot-section"
        aria-labelledby="pot-summary-heading"
        data-testid="pot-summary-section"
      >
        <h2 id="pot-summary-heading">{text.summarySectionTitle}</h2>

        <div className="pot-metrics-grid">
          <Card title={text.totalBalanceLabel}>
            <p
              className="pot-metric-value"
              data-testid="total-pot-balance-rand"
            >
              {formatMzarAsRand(data.totalBalanceMzar)}
            </p>
            <p className="field-help">
              {text.targetGoalLabel}: {formatMzarAsRand(data.targetPotMzar)}
            </p>
          </Card>

          <Card title={text.lifecycleStateLabel}>
            <p className="pot-metric-value" data-testid="pot-lifecycle-state">
              {data.state}
            </p>
            <p className="field-help">
              {text.memberCapLabel}: {formatMzarAsRand(data.memberCapMzar)}
            </p>
          </Card>

          <Card title={text.settlementEstimateLabel}>
            <p
              className="pot-metric-value"
              data-testid="pot-settlement-estimate"
            >
              {formatMzarAsRand(data.settlementTotalMzar)}
            </p>
            <p className="field-help">
              Contract: <code>{data.contractId.slice(0, 8)}…</code>
            </p>
          </Card>
        </div>

        <div className="pot-progress-card">
          <div className="pot-progress-header">
            <strong>{text.progressLabel}</strong>
            <span data-testid="contribution-progress-text">
              {formatMzarAsRand(data.totalBalanceMzar)} /{" "}
              {formatMzarAsRand(data.targetPotMzar)} (
              {data.contributionProgressPercent}%)
            </span>
          </div>
          <div
            className="pot-progress-track"
            role="progressbar"
            aria-label={text.progressLabel}
            aria-valuenow={data.contributionProgressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            data-testid="contribution-progressbar"
          >
            <div
              className="pot-progress-fill"
              style={{ width: `${data.contributionProgressPercent}%` }}
            />
          </div>
          <div className="pot-progress-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => simulateContribution(25)}
              data-testid="simulate-contribution-btn"
            >
              {text.simulateContribBtn}
            </Button>
          </div>
        </div>

        <div className="pot-members-wrapper">
          <h3>{text.membersTitle}</h3>
          <div className="pot-members-list" data-testid="pot-member-list">
            {data.members.map((member) => (
              <article
                key={member.id}
                className="pot-member-card"
                data-testid={`pot-member-${member.id}`}
              >
                <div className="pot-member-header">
                  <div>
                    <strong>{member.displayName}</strong>
                    <span className="pot-member-role">{member.roleLabel}</span>
                  </div>
                  <span
                    className="pot-member-amount"
                    data-testid={`member-contrib-${member.id}`}
                  >
                    {formatMzarAsRand(member.contributedMzar)}
                  </span>
                </div>
                <div className="pot-member-details">
                  <span>
                    {text.memberColCapProgress}: {member.progressPercent}% of{" "}
                    {formatMzarAsRand(member.memberCapMzar)}
                  </span>
                  <span>
                    {text.memberColShare}: {member.sharePercent.toFixed(1)}%
                  </span>
                  <span>
                    {text.memberColPayout}:{" "}
                    {formatMzarAsRand(member.estimatedPayoutMzar)}
                  </span>
                </div>
                <div
                  className="pot-member-bar"
                  role="progressbar"
                  aria-label={`${member.displayName} contribution cap progress`}
                  aria-valuenow={member.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="pot-member-bar-fill"
                    style={{ width: `${member.progressPercent}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Asset Visual Representation */}
      <section
        className="pot-section"
        aria-labelledby="pot-holdings-heading"
        data-testid="asset-visual-holdings"
      >
        <h2 id="pot-holdings-heading">{text.holdingsSectionTitle}</h2>
        <p>{text.holdingsSectionIntro}</p>

        <div className="pot-term-toggle">
          <Button
            type="button"
            variant={
              productKey === "demoTimeCompressed" ? "primary" : "secondary"
            }
            onClick={() => setProductKey("demoTimeCompressed")}
            data-testid="term-compressed-btn"
          >
            {text.termToggleCompressed}
          </Button>
          <Button
            type="button"
            variant={productKey === "standard91Day" ? "primary" : "secondary"}
            onClick={() => setProductKey("standard91Day")}
            data-testid="term-standard-btn"
          >
            {text.termToggleStandard}
          </Button>
        </div>

        <Stepper label="Pot holdings visual narrative" steps={narrativeSteps} />

        <dl className="pot-holdings-grid">
          <div className="pot-holding-box">
            <dt>{text.exactZatbillLabel}</dt>
            <dd data-testid="zatbill-exact-amount">
              {data.holdings.zatbillHeldFormatted}
            </dd>
            <span className="field-help">
              Face value: {formatMzarAsRand(data.holdings.totalFaceValueMzar)}
            </span>
          </div>

          <div className="pot-holding-box">
            <dt>{text.maturityCountdownHeading}</dt>
            <dd data-testid="maturity-countdown">
              {data.holdings.countdown.formatted}
            </dd>
            <span className="field-help">
              Term elapsed: {data.holdings.countdown.elapsedPercent}% (
              {data.holdings.productLabel})
            </span>
          </div>

          <div className="pot-holding-box">
            <dt>{text.indicativeYieldHeading}</dt>
            <dd data-testid="indicative-yield-label">
              {data.holdings.indicativeYieldLabel}
            </dd>
            <span className="field-help">
              {text.indicativeReturnHeading}:{" "}
              {formatMzarAsRand(data.holdings.indicativeProfitMzar)}
            </span>
          </div>

          <div className="pot-holding-box">
            <dt>{text.attestedReserveHeading}</dt>
            <dd data-testid="attested-reserve-amount">
              {formatMzarAsRand(data.holdings.attestedReservesMzar)} (
              {data.holdings.backingRatioPercent}% backed)
            </dd>
            <span className="field-help">
              {text.discountPriceHeading}: R{" "}
              {data.holdings.discountPricePerUnit.toFixed(6)} / unit
            </span>
          </div>
        </dl>
      </section>

      {/* Section 3: Activity Feed */}
      <section
        className="pot-section"
        aria-labelledby="pot-activity-heading"
        data-testid="pot-activity-feed"
      >
        <div className="pot-activity-header">
          <div>
            <h2 id="pot-activity-heading">{text.activitySectionTitle}</h2>
            <p>{text.activitySectionIntro}</p>
          </div>
          <div className="pot-activity-controls">
            <Button
              type="button"
              variant="secondary"
              onClick={() => toggleEmptyActivity()}
              data-testid="toggle-empty-activity-btn"
            >
              {isEmptyActivity ? text.showEventsBtn : text.showEmptyBtn}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLoadingState(!loading)}
              data-testid="toggle-loading-activity-btn"
            >
              {loading ? text.hideLoadingBtn : text.showLoadingBtn}
            </Button>
          </div>
        </div>

        {loading ? (
          <div data-testid="activity-loading-state">
            <LoadingState label={text.loadingLabel} />
          </div>
        ) : data.activity.length === 0 ? (
          <div data-testid="activity-empty-state">
            <EmptyState title={text.emptyTitle}>{text.emptyBody}</EmptyState>
          </div>
        ) : (
          <ol className="pot-activity-list" data-testid="activity-event-list">
            {data.activity.map((event) => (
              <li
                key={event.id}
                className="pot-activity-item"
                data-testid={`activity-item-${event.id}`}
              >
                <div className="pot-activity-top">
                  <strong>{event.title}</strong>
                  <TransactionStatus label={event.statusLabel} />
                </div>
                <p>{event.description}</p>
                <div className="pot-activity-meta">
                  <span>Actor: {event.actor}</span>
                  {event.amountFormatted && (
                    <span>Amount: {event.amountFormatted}</span>
                  )}
                  {event.zatbillAmount !== null && (
                    <span>
                      ZATBILL: {event.zatbillAmount.toFixed(2)} MOCK ZATBILL
                    </span>
                  )}
                  <a href={event.explorerUrl} target="_blank" rel="noreferrer">
                    {text.viewTx} ({event.txHash.slice(0, 8)}…)
                  </a>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="asset-footer">
        <a href={locale === "zu" ? "/zu" : "/"}>{text.backHome}</a>
        <a
          href={locale === "zu" ? "/pot/contribute?lang=zu" : "/pot/contribute"}
          data-testid="nav-contribute-pot-link"
        >
          {locale === "zu" ? "Faka Umnikelo" : "Contribute"}
        </a>
        <a
          href={locale === "zu" ? "/pot/create?lang=zu" : "/pot/create"}
          data-testid="nav-create-pot-link"
        >
          {locale === "zu" ? "Dala Iphodwe" : "Create a Pot"}
        </a>
        <a
          href={locale === "zu" ? "/pot/join?lang=zu" : "/pot/join"}
          data-testid="nav-join-pot-link"
        >
          {locale === "zu" ? "Joyina Iphodwe" : "Join a Pot"}
        </a>
        <a href={locale === "zu" ? "/onboarding?lang=zu" : "/onboarding"}>
          {text.onboardingLink}
        </a>
        <a href={locale === "zu" ? "/assets?lang=zu" : "/assets"}>
          {text.transparencyLink}
        </a>
      </footer>
    </main>
  );
}
