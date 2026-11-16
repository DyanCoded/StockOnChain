"use client";

import { useState } from "react";
import {
  executeMemberClaim,
  getClaimBreakdown,
  type ClaimBreakdown,
  type ClaimReceipt,
} from "@stockonchain/chain/redeem";
import { formatMzarAsRand } from "../lib/currency";
import CashoutSimulator from "./cashout-simulator";
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  TransactionStatus,
} from "./design-system";

export interface PotRedeemCashoutFlowProps {
  locale?: "en" | "zu";
  potName?: string;
  potContractId?: string;
  initialBreakdown?: Partial<ClaimBreakdown>;
  onClaimSuccess?: (receipt: ClaimReceipt) => void;
}

const copy = {
  en: {
    maturityBannerTitle: "🎉 Stokvel Pot Has Matured & Settled",
    maturityBannerBody:
      "The agreed investment term has concluded. Primary dealer face-value settlement is complete and pro-rata member payouts are now unlocked.",
    lockedBannerTitle: "⏳ Pot Investment Locked Until Maturity",
    lockedBannerBody:
      "Funds are currently invested in tokenized South African Treasury Bills. Early liquidation before the maturity date is strictly prohibited by smart contract rules.",
    cardTitle: "Claim Share & Cash-Out",
    payoutSummaryHeading: "Your Pro-Rata Entitlement Breakdown",
    principalLabel: "Original Principal Contributed",
    yieldLabel: "Accumulated Money Market Yield",
    totalPayoutLabel: "Total Payout Due (ZAR)",
    sharePercentLabel: "Your Ownership Share in Pot",
    maturedDateLabel: "Maturity Date",
    claimBtn: "Claim My Share (to Wallet)",
    claimingBtn: "Claiming pro-rata share on Stellar Testnet...",
    claimedSuccessTitle: "✓ Share Successfully Claimed to Wallet",
    proceedToCashoutBtn: "Proceed to Bank / Mobile Money Cash-Out (SEP-24)",
    timeRemainingLabel: "Time remaining until maturity",
    alreadyClaimedTitle: "Share Already Claimed",
    alreadyClaimedBody:
      "You have already claimed your full entitlement from this pot.",
    viewReceiptDetails: "Transaction Details & Block Explorer",
    earlyClaimBlockedHeading: "Early Claim Blocked by Pot Rules",
    cashoutHeading:
      "Step 2: Instant Payout to Local Bank or Mobile Rail (Simulated)",
  },
  zu: {
    maturityBannerTitle:
      "🎉 Iphodwe le-Stokvel Selivuthiwe Futhi Selixazululiwe",
    maturityBannerBody:
      "Isikhathi sokutshala imali sesiphelile. Inkokhelo ye-dealer isiqediwe futhi izabelo zamalungu sezikulungele ukukhishwa.",
    lockedBannerTitle:
      "⏳ Imali Yephodwe Isavaliwe Kuze Kufike Isikhathi Sokuvuthwa",
    lockedBannerBody:
      "Izimali zivaliwe kuma-Treasury Bills aseNingizimu Afrika. Ukukhipha imali ngaphambi kwesikhathi akuvumelekile.",
    cardTitle: "Thatha Isabelo Sakho & Khipha Imali",
    payoutSummaryHeading: "Isifinyezo Senkokhelo Yakho",
    principalLabel: "Imali Oyifakile (Principal)",
    yieldLabel: "Inzuzo Elingisiwe Yezimakethe Zemali",
    totalPayoutLabel: "Isamba Senkokhelo Yakho (ZAR)",
    sharePercentLabel: "Isabelo Sakho Ephodweni",
    maturedDateLabel: "Usuku Lokuvuthwa",
    claimBtn: "Thatha Isabelo Sami (Esikhwameni)",
    claimingBtn: "Kukhishwa isabelo ku-Stellar Testnet...",
    claimedSuccessTitle: "✓ Isabelo Sithunyelwe Esikhwameni Sakho",
    proceedToCashoutBtn:
      "Qhubeka Nokukhipha Imali Ebhange / Eseluleni (SEP-24)",
    timeRemainingLabel: "Isikhathi esisele ngaphambi kokuvuthwa",
    alreadyClaimedTitle: "Isabelo Sesikhishiwe",
    alreadyClaimedBody: "Usuvele wasikhipha isabelo sakho kuleli phodwe.",
    viewReceiptDetails: "Imininingwane Yokuthengiselana Ne-Block Explorer",
    earlyClaimBlockedHeading: "Ukukhipha Ngaphambi Kwesikhathi Akuvumelekile",
    cashoutHeading:
      "Isinyathelo 2: Khipha Imali Ebhange noma Eseluleni (Ukulingisa)",
  },
};

export default function PotRedeemCashoutFlow({
  locale = "en",
  potName = "Cape Town Community Pot",
  potContractId = "CBIZM7UPAA7OCRRHSEL43MMDZIKNYQEMB5LB7HZQ32KMV44V6ZW456XM",
  initialBreakdown,
  onClaimSuccess,
}: PotRedeemCashoutFlowProps) {
  const text = copy[locale] || copy.en;

  const [breakdown, setBreakdown] = useState<ClaimBreakdown>(() =>
    getClaimBreakdown(initialBreakdown),
  );
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimReceipt, setClaimReceipt] = useState<ClaimReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorRemedy, setErrorRemedy] = useState<string | null>(null);
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [showTxDetails, setShowTxDetails] = useState(false);

  // Handle Member Claim Submission
  const handleClaim = async () => {
    setIsClaiming(true);
    setErrorMessage(null);
    setErrorRemedy(null);

    try {
      const res = await executeMemberClaim({
        breakdown,
        potContractId,
      });

      if (!res.success) {
        setErrorMessage(
          res.error?.userMessage || "Claim could not be processed.",
        );
        setErrorRemedy(res.error?.remedy || null);
        return;
      }

      if (res.receipt) {
        setClaimReceipt(res.receipt);
        setBreakdown((prev) => ({
          ...prev,
          hasClaimed: true,
        }));
        if (onClaimSuccess) {
          onClaimSuccess(res.receipt);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unexpected claim failure.",
      );
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="redeem-flow-container" data-testid="pot-redeem-container">
      {/* 1. Prominent Maturity or Locked Banner */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderRadius: "8px",
          marginBottom: "1.25rem",
          background: breakdown.isMatured ? "#f0fdf4" : "#fefce8",
          border: breakdown.isMatured
            ? "1px solid #bbf7d0"
            : "1px solid #fef08a",
        }}
        data-testid="maturity-status-banner"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.25rem",
          }}
        >
          <strong
            style={{
              color: breakdown.isMatured ? "#166534" : "#854d0e",
              fontSize: "1.05rem",
            }}
          >
            {breakdown.isMatured
              ? text.maturityBannerTitle
              : text.lockedBannerTitle}
          </strong>
          <TransactionStatus
            label={
              breakdown.isMatured ? "Matured & Settled" : "Locked in T-Bill"
            }
          />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: breakdown.isMatured ? "#14532d" : "#713f12",
          }}
        >
          {breakdown.isMatured
            ? text.maturityBannerBody
            : `${text.lockedBannerBody} (${text.timeRemainingLabel}: ${breakdown.timeRemainingSeconds}s)`}
        </p>
      </div>

      {/* 2. Main Claim & Entitlement Card */}
      <Card
        title={`${text.cardTitle} · ${potName}`}
        data-testid="pot-claim-card"
      >
        <h4
          style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "#374151" }}
        >
          {text.payoutSummaryHeading}
        </h4>

        {/* Breakdown Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.85rem",
            background: "#f9fafb",
            padding: "1.1rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            marginBottom: "1.25rem",
          }}
          data-testid="entitlement-breakdown-grid"
        >
          <div>
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              {text.principalLabel}:
            </span>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: "600",
                color: "#1f2937",
              }}
            >
              {breakdown.principalFormatted}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              {text.yieldLabel}:
            </span>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: "600",
                color: "#166534",
              }}
            >
              +{breakdown.accumulatedYieldFormatted}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              {text.sharePercentLabel}:
            </span>
            <div
              style={{ fontSize: "1rem", fontWeight: "500", color: "#2563eb" }}
            >
              {breakdown.sharePercent}%
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
              {text.maturedDateLabel}:
            </span>
            <div style={{ fontSize: "0.9rem", color: "#4b5563" }}>
              {breakdown.maturityDateFormatted}
            </div>
          </div>

          {/* Highlighted Total Payout */}
          <div
            style={{
              gridColumn: "span 2",
              borderTop: "2px solid #e5e7eb",
              paddingTop: "0.75rem",
              marginTop: "0.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: "1rem", fontWeight: "bold", color: "#111827" }}
            >
              {text.totalPayoutLabel}:
            </span>
            <span
              style={{
                fontSize: "1.35rem",
                fontWeight: "bold",
                color: "#059669",
              }}
              data-testid="total-payout-amount"
            >
              {breakdown.totalPayoutFormatted}
            </span>
          </div>
        </div>

        {/* 3. Plain-Language Early Claim Restriction Block */}
        {!breakdown.isMatured && (
          <div
            style={{ marginBottom: "1.25rem" }}
            data-testid="early-claim-restriction-block"
          >
            <ErrorState title={text.earlyClaimBlockedHeading}>
              <p style={{ margin: 0 }}>
                Claims cannot be processed because this Stokvel Pot has not
                reached its maturity date yet.
              </p>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  fontStyle: "italic",
                  color: "#4b5563",
                }}
              >
                <strong>Next step:</strong> Wait until the maturity timestamp is
                reached and the primary dealer completes settlement.
              </p>
            </ErrorState>
          </div>
        )}

        {/* 4. Already Claimed State */}
        {breakdown.hasClaimed && !claimReceipt && (
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "6px",
              marginBottom: "1.25rem",
            }}
            data-testid="already-claimed-notice"
          >
            <strong style={{ color: "#1e40af" }}>
              {text.alreadyClaimedTitle}
            </strong>
            <p
              style={{
                margin: "0.25rem 0 0 0",
                fontSize: "0.9rem",
                color: "#1e3a8a",
              }}
            >
              {text.alreadyClaimedBody}
            </p>
          </div>
        )}

        {/* 5. Claim Receipt View */}
        {claimReceipt && (
          <div
            style={{
              padding: "1rem",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              marginBottom: "1.25rem",
            }}
            data-testid="claim-receipt-box"
          >
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#166534" }}>
              {text.claimedSuccessTitle}
            </h4>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#14532d" }}>
              Your payout of <strong>{claimReceipt.claimedFormatted}</strong> is
              now in your custodial-lite wallet on Stellar Testnet.
            </p>

            <div style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setShowTxDetails(!showTxDetails)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "0.85rem",
                  textDecoration: "underline",
                }}
                data-testid="toggle-claim-tx-details"
              >
                {showTxDetails
                  ? "▲ Hide Details"
                  : `▼ ${text.viewReceiptDetails}`}
              </button>

              {showTxDetails && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.5rem",
                    background: "#fff",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    wordBreak: "break-all",
                    border: "1px solid #d1d5db",
                  }}
                  data-testid="claim-tx-details-content"
                >
                  <div>
                    <strong>Tx Hash:</strong> <code>{claimReceipt.txHash}</code>
                  </div>
                  <div style={{ marginTop: "0.25rem" }}>
                    <a
                      href={claimReceipt.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#2563eb", fontWeight: "600" }}
                    >
                      Inspect on Stellar.Expert ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div
            style={{ marginBottom: "1rem" }}
            data-testid="claim-error-message"
          >
            <ErrorState title="Unable to Process Claim">
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

        {/* Action Button: Claim Share or Cash-Out */}
        {claimReceipt || breakdown.hasClaimed ? (
          <Button
            variant="primary"
            onClick={() => setShowCashoutModal(true)}
            data-testid="proceed-cashout-btn"
          >
            {text.proceedToCashoutBtn}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleClaim}
            disabled={!breakdown.isMatured || isClaiming}
            data-testid="execute-claim-btn"
          >
            {isClaiming ? text.claimingBtn : text.claimBtn}
          </Button>
        )}
      </Card>

      {/* 6. Seamless SEP-24 Cash-Out Off-Ramp Drawer / Section */}
      {showCashoutModal && (
        <div
          style={{ marginTop: "1.5rem" }}
          data-testid="sep24-cashout-section"
        >
          <h3
            style={{
              fontSize: "1.1rem",
              marginBottom: "0.75rem",
              color: "#1f2937",
            }}
          >
            {text.cashoutHeading}
          </h3>
          <CashoutSimulator
            locale={locale}
            prefillAmount={breakdown.totalPayoutMzar}
          />
        </div>
      )}
    </div>
  );
}
