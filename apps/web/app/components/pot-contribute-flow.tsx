"use client";

import { useState } from "react";
import {
  executeContribution,
  executeTopUp,
  getContributeState,
  type ContributeState,
  type ContributionReceipt,
} from "@stockonchain/chain/contribute";
import { formatMzarAsRand } from "../lib/currency";
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  TransactionStatus,
} from "./design-system";

export interface PotContributeFlowProps {
  locale?: "en" | "zu";
  potName?: string;
  potContractId?: string;
  initialState?: Partial<ContributeState>;
  onContributionSuccess?: (receipt: ContributionReceipt) => void;
}

const copy = {
  en: {
    title: "Contribute to Pot",
    subtitle:
      "Make an instant, rules-based contribution to your stokvel pot. Transactions are sponsored on Stellar Testnet.",
    walletBalanceLabel: "Your Wallet Balance (MOCK mZAR)",
    topUpBtn: "Instant Top-Up (+R 100,00)",
    topUpSuccess: "✓ Topped up 100,00 MOCK mZAR via Testnet faucet",
    topUpLoading: "Requesting sponsored Testnet top-up...",
    potProgressLabel: "Pot Funding Progress",
    capLabel: "Per-Member Contribution Cap",
    alreadyContributedLabel: "Your Contribution so Far",
    remainingCapLabel: "Remaining Cap Allowance",
    amountInputLabel: "Contribution Amount (ZAR)",
    quickSelectAmounts: [25, 50, 100, 200],
    contributeBtn: "Confirm & One-Tap Contribute",
    submittingBtn: "Submitting sponsored transaction to Stellar...",
    receiptTitle: "Contribution Confirmed!",
    receiptSubtitle:
      "Your payment was successfully settled into the pot smart contract.",
    newShareLabel: "Updated Member Share",
    previousShareLabel: "Previous Share",
    amountContributedLabel: "Amount Contributed",
    totalMemberContributionLabel: "Your New Total Contribution",
    detailsToggle: "Transaction & Block Explorer Details",
    txHashLabel: "Transaction Hash",
    timestampLabel: "Confirmed At",
    explorerLink: "Inspect on Stellar.Expert Explorer",
    makeAnotherBtn: "Make Another Contribution",
    unverifiedNotice:
      "You must complete compliance verification before contributing to this pot.",
    goToKycBtn: "Go to Verification",
    closedWindowNotice:
      "Contributions are paused because this pot is currently invested or matured.",
    overCapNotice:
      "This amount exceeds your remaining per-member contribution cap.",
    insufficientNotice: "Your wallet balance is too low for this contribution.",
  },
  zu: {
    title: "Faka Umnikelo Ephodweni",
    subtitle:
      "Faka umnikelo osheshayo e-stokvelini lakho. Imali yokuthengiselana ixhaswe ku-Stellar Testnet.",
    walletBalanceLabel: "Ibhalansi Yesikhwama Sakho (MOCK mZAR)",
    topUpBtn: "Faka Imali Ngokushesha (+R 100,00)",
    topUpSuccess: "✓ Kufakwe i-100,00 MOCK mZAR nge-Testnet faucet",
    topUpLoading: "Kucelwa imali ye-Testnet exhaswe...",
    potProgressLabel: "Inqubekela-phambili Yephodwe",
    capLabel: "Umkhawulo Welungu Ngamunye",
    alreadyContributedLabel: "Umnikelo Wakho Kuze Kube Manje",
    remainingCapLabel: "Isabelo Somkhawulo Esisele",
    amountInputLabel: "Inani Lomnikelo (ZAR)",
    quickSelectAmounts: [25, 50, 100, 200],
    contributeBtn: "Qinisekisa & Faka Umnikelo Ngokuchofoza Okukodwa",
    submittingBtn: "Kuthunyelwa ukuthengiselana ku-Stellar...",
    receiptTitle: "Umnikelo Uqinisekisiwe!",
    receiptSubtitle:
      "Inkokhelo yakho ingene ngempumelelo kwinkontileka yephodwe.",
    newShareLabel: "Isabelo Sakho Esisha",
    previousShareLabel: "Isabelo Esedlule",
    amountContributedLabel: "Inani Elifakiwe",
    totalMemberContributionLabel: "Isamba Sakho Esisha Seminikelo",
    detailsToggle: "Imininingwane Yokuthengiselana Ne-Block Explorer",
    txHashLabel: "I-Hash Yokuthengiselana",
    timestampLabel: "Kuqinisekiswe Ngo",
    explorerLink: "Bheka ku-Stellar.Expert Explorer",
    makeAnotherBtn: "Faka Omunye Umnikelo",
    unverifiedNotice:
      "Kumele uqedele ukuqinisekiswa ngaphambi kokufaka umnikelo.",
    goToKycBtn: "Yiya Ekuqinisekisweni",
    closedWindowNotice:
      "Iminikelo imisiwe ngoba iphodwe selitshaliwe noma selivuthiwe.",
    overCapNotice: "Leli nani lidlula umkhawulo wakho womnikelo oseleyo.",
    insufficientNotice: "Ibhalansi yesikhwama sakho ayanele lo mnikelo.",
  },
};

export default function PotContributeFlow({
  locale = "en",
  potName = "Family & Friends Stokvel",
  potContractId = "CBIZM7UPAA7OCRRHSEL43MMDZIKNYQEMB5LB7HZQ32KMV44V6ZW456XM",
  initialState,
  onContributionSuccess,
}: PotContributeFlowProps) {
  const text = copy[locale] || copy.en;

  const [state, setState] = useState<ContributeState>(() =>
    getContributeState(initialState),
  );
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>("50");
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topUpNotice, setTopUpNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorRemedy, setErrorRemedy] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ContributionReceipt | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Handle Quick Select
  const handleAmountSelect = (val: number) => {
    setSelectedAmount(val);
    setCustomAmount(String(val));
    setErrorMessage(null);
  };

  // Handle Custom Input
  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setCustomAmount(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedAmount(parsed);
    }
    setErrorMessage(null);
  };

  // Handle Instant Faucet Top-Up
  const handleTopUp = async () => {
    setIsTopUpLoading(true);
    setTopUpNotice(null);
    setErrorMessage(null);
    try {
      const res = await executeTopUp(state.userAddress, 100);
      setState((prev) => ({
        ...prev,
        walletBalanceMzar: prev.walletBalanceMzar + res.newBalanceMzar,
        walletBalanceFormatted: formatMzarAsRand(
          prev.walletBalanceMzar + res.newBalanceMzar,
        ),
      }));
      setTopUpNotice(text.topUpSuccess);
    } catch {
      setErrorMessage(
        "Top-up request failed. Please check network connection.",
      );
    } finally {
      setIsTopUpLoading(false);
    }
  };

  // Handle One-Tap Contribute Submission
  const handleContribute = async () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMessage(
        "Please enter a valid contribution amount greater than zero.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setErrorRemedy(null);

    try {
      const res = await executeContribution({
        amountMzar: amount,
        state,
        potContractId,
      });

      if (!res.success) {
        setErrorMessage(
          res.error?.userMessage || "Contribution could not be processed.",
        );
        setErrorRemedy(res.error?.remedy || null);
        return;
      }

      if (res.receipt) {
        setReceipt(res.receipt);
        // Update local state
        setState((prev) => {
          const newBal = prev.walletBalanceMzar - amount;
          const newContrib = prev.memberContributionMzar + amount;
          return {
            ...prev,
            walletBalanceMzar: newBal,
            walletBalanceFormatted: formatMzarAsRand(newBal),
            memberContributionMzar: newContrib,
            remainingCapMzar: Math.max(0, prev.memberCapMzar - newContrib),
            currentPotTotalMzar: prev.currentPotTotalMzar + amount,
          };
        });
        if (onContributionSuccess) {
          onContributionSuccess(res.receipt);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unexpected transaction failure.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      title={`${text.title} · ${potName}`}
      data-testid="pot-contribute-card"
    >
      <p
        style={{
          margin: "-0.5rem 0 1rem 0",
          color: "#6b7280",
          fontSize: "0.9rem",
        }}
      >
        {text.subtitle}
      </p>
      {/* 1. Unverified State (A-01) */}
      {!state.isVerified && (
        <div
          style={{ marginBottom: "1rem" }}
          data-testid="unverified-guard-box"
        >
          <ErrorState title="Verification Required">
            <p style={{ margin: 0 }}>{text.unverifiedNotice}</p>
            <div style={{ marginTop: "0.75rem" }}>
              <a href={locale === "zu" ? "/onboarding?lang=zu" : "/onboarding"}>
                <Button variant="primary">{text.goToKycBtn}</Button>
              </a>
            </div>
          </ErrorState>
        </div>
      )}

      {/* 2. Closed Window Notice */}
      {!state.isWindowOpen && (
        <div style={{ marginBottom: "1rem" }} data-testid="closed-window-box">
          <ErrorState title={`Pot State: ${state.potLifecycleState}`}>
            {text.closedWindowNotice}
          </ErrorState>
        </div>
      )}

      {/* 3. Confirmed Receipt View */}
      {receipt ? (
        <div
          className="receipt-view"
          data-testid="contribution-receipt"
          style={{ padding: "0.5rem" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#166534" }}>
              {text.receiptTitle}
            </h3>
            <TransactionStatus label="Confirmed on Testnet" />
          </div>
          <p style={{ color: "#4b5563", marginBottom: "1.25rem" }}>
            {text.receiptSubtitle}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              background: "#f9fafb",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                {text.amountContributedLabel}
              </span>
              <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
                {receipt.amountFormatted}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                {text.newShareLabel}
              </span>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  color: "#0284c7",
                }}
              >
                {receipt.newSharePercent}%
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                    marginLeft: "0.25rem",
                  }}
                >
                  (was {receipt.previousSharePercent}%)
                </span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                {text.totalMemberContributionLabel}
              </span>
              <div style={{ fontWeight: "600" }}>
                {receipt.newMemberTotalFormatted}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                {text.timestampLabel}
              </span>
              <div style={{ fontSize: "0.85rem" }}>
                {new Date(receipt.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Details Drawer */}
          <div style={{ marginBottom: "1.25rem" }}>
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                cursor: "pointer",
                padding: 0,
                fontSize: "0.9rem",
                textDecoration: "underline",
              }}
              data-testid="toggle-details-btn"
            >
              {showDetails ? "▲ Hide Details" : `▼ ${text.detailsToggle}`}
            </button>

            {showDetails && (
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  background: "#f3f4f6",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  wordBreak: "break-all",
                }}
                data-testid="receipt-details-drawer"
              >
                <div>
                  <strong>{text.txHashLabel}:</strong>{" "}
                  <code>{receipt.txHash}</code>
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <a
                    href={receipt.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#2563eb", fontWeight: "600" }}
                  >
                    {text.explorerLink} ↗
                  </a>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              setReceipt(null);
              setErrorMessage(null);
            }}
            data-testid="make-another-btn"
          >
            {text.makeAnotherBtn}
          </Button>
        </div>
      ) : (
        /* 4. Active Contribution Form */
        <div>
          {/* Top-up header banner */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.85rem", color: "#166534" }}>
                {text.walletBalanceLabel}
              </span>
              <div
                style={{
                  fontSize: "1.15rem",
                  fontWeight: "bold",
                  color: "#14532d",
                }}
              >
                {state.walletBalanceFormatted}
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleTopUp}
              disabled={isTopUpLoading || isSubmitting}
              data-testid="instant-topup-btn"
            >
              {isTopUpLoading ? text.topUpLoading : text.topUpBtn}
            </Button>
          </div>

          {topUpNotice && (
            <div
              style={{
                fontSize: "0.85rem",
                color: "#166534",
                marginBottom: "0.75rem",
                fontWeight: "500",
              }}
              data-testid="topup-notice"
            >
              {topUpNotice}
            </div>
          )}

          {/* Member Cap Progress Box */}
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <div>
              <span style={{ color: "#6b7280" }}>
                {text.alreadyContributedLabel}:
              </span>{" "}
              <strong>{formatMzarAsRand(state.memberContributionMzar)}</strong>
            </div>
            <div>
              <span style={{ color: "#6b7280" }}>{text.capLabel}:</span>{" "}
              <strong>{formatMzarAsRand(state.memberCapMzar)}</strong>
            </div>
            <div
              style={{
                gridColumn: "span 2",
                borderTop: "1px solid #e5e7eb",
                paddingTop: "0.5rem",
              }}
            >
              <span style={{ color: "#6b7280" }}>
                {text.remainingCapLabel}:
              </span>{" "}
              <strong
                style={{
                  color: state.remainingCapMzar > 0 ? "#166534" : "#991b1b",
                }}
              >
                {formatMzarAsRand(state.remainingCapMzar)}
              </strong>
            </div>
          </div>

          {/* Amount Quick Select & Input */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              htmlFor="contrib-amount-input"
              style={{
                display: "block",
                fontSize: "0.9rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              {text.amountInputLabel}
            </label>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              {text.quickSelectAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAmountSelect(amt)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border:
                      selectedAmount === amt
                        ? "2px solid #2563eb"
                        : "1px solid #d1d5db",
                    background: selectedAmount === amt ? "#eff6ff" : "#fff",
                    fontWeight: selectedAmount === amt ? "bold" : "normal",
                    cursor: "pointer",
                  }}
                  data-testid={`quick-amount-${amt}`}
                >
                  +{amt}
                </button>
              ))}
            </div>

            <input
              id="contrib-amount-input"
              type="number"
              min="1"
              max={state.remainingCapMzar}
              value={customAmount}
              onChange={handleCustomChange}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                fontSize: "1rem",
              }}
              data-testid="custom-amount-input"
            />
          </div>

          {/* Actionable Error State (if any) */}
          {errorMessage && (
            <div
              style={{ marginBottom: "1rem" }}
              data-testid="contribute-error-message"
            >
              <ErrorState title="Unable to Complete Contribution">
                <p style={{ margin: 0 }}>{errorMessage}</p>
                {errorRemedy && (
                  <p
                    style={{
                      margin: "0.5rem 0 0 0",
                      fontStyle: "italic",
                      color: "#4b5563",
                    }}
                  >
                    <strong>Next step:</strong> {errorRemedy}
                  </p>
                )}
              </ErrorState>
            </div>
          )}

          {/* One-Tap Contribute Submit Button */}
          <Button
            variant="primary"
            onClick={handleContribute}
            disabled={!state.isVerified || !state.isWindowOpen || isSubmitting}
            data-testid="one-tap-contribute-btn"
          >
            {isSubmitting ? text.submittingBtn : text.contributeBtn}
          </Button>
        </div>
      )}
    </Card>
  );
}
