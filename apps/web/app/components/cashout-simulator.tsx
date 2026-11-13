"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  Toast,
  TransactionStatus,
} from "./design-system";

export interface PayoutQuote {
  rail: "instant_bank" | "mobile_money";
  railLabel: string;
  amountMzar: number;
  fixedFeeMzar: number;
  percentFeeMzar: number;
  totalFeeMzar: number;
  netPayoutMzar: number;
  estimatedTimeToCashSeconds: number;
  timeToCashLabel: string;
  simulated: true;
  disclaimer: string;
}

const copy = {
  en: {
    title: "Simulated Cash-Out & Local Payout Rails (SEP-24)",
    badge: "SIMULATED RAIL - DEMO ONLY",
    desc: "Withdraw settled mZAR to simulated South African payment rails. Experience transparent fees and time-to-cash estimates without handling crypto jargon.",
    railSelect: "Select Payout Rail",
    bankOption: "Instant Bank Payment (EFT/PayShap-style)",
    mobileOption: "Mobile Money / Cash Voucher",
    amountLabel: "mZAR Amount to Withdraw",
    recipientLabel: "Recipient Account / Phone Number",
    bankNameLabel: "Destination Bank (Simulated)",
    quoteButton: "Calculate Fee & Time-to-Cash",
    feeSummaryTitle: "Fee & Settlement Transparency",
    fixedFee: "Fixed Network Rail Fee",
    percentFee: "Settlement Fee",
    totalFee: "Total Fees Deducted",
    netPayout: "Estimated Cash Received",
    timeToCash: "Estimated Time-to-Cash",
    withdrawButton: "Confirm & Withdraw Cash",
    withdrawing: "Processing simulated off-ramp payout...",
    successTitle: "Simulated Cash-Out Completed",
    externalTx: "Simulated Rail Reference",
    stellarTx: "Stellar Settlement Transaction",
    depositTitle: "Alternative Top-Up (SEP-24 Deposit Simulation)",
    depositDesc:
      "Simulate fiat top-up to receive testnet mZAR as an alternative to the faucet.",
    depositButton: "Simulate Deposit Top-Up",
    depositing: "Simulating deposit...",
    connectPrompt:
      "Connect a wallet above or use the demo custodial wallet to simulate cash-out.",
  },
  zu: {
    title: "Ukukhipha Imali Nokukhokha Kwasendaweni (Ukulingisa SEP-24)",
    badge: "UKULINGISA KUPHELA - ISIVIVINYO",
    desc: "Khipha i-mZAR eyongiwe uye ezindleleni zokukhokha zaseNingizimu Afrika. Thola izimali ezicacile nesikhathi sokuthola imali ngaphandle kwemigomo enzima.",
    railSelect: "Khetha Indlela Yokukhokha",
    bankOption: "Inkokhelo Yasebhange Esheshayo (EFT/PayShap)",
    mobileOption: "Imali Yeselula / Ivawusha",
    amountLabel: "Inani le-mZAR Elikhishiwe",
    recipientLabel: "I-akhawunti / Inombolo Yeselula Yomamukeli",
    bankNameLabel: "Ibhange (Lokulingisa)",
    quoteButton: "Bala Imali Nemizuzu Yokulinda",
    feeSummaryTitle: "Ukubalwa Kwemali Nesikhathi",
    fixedFee: "Imali Ebekiwe Yenketho",
    percentFee: "Imali Yokuhlanganisa",
    totalFee: "Isamba Semali Ebanjwayo",
    netPayout: "Imali Ozoyithola",
    timeToCash: "Isikhathi Sokufika Kwemali",
    withdrawButton: "Qinisekisa Ukukhipha Imali",
    withdrawing: "Kusetshenzwa inkokhelo yokulingisa...",
    successTitle: "Ukukhipha Imali Kuphelile (Ukulingisa)",
    externalTx: "Inkomba Yokukhokha (Yokulingisa)",
    stellarTx: "Ukudluliselwa Kwe-Stellar",
    depositTitle: "Enye Indlela Yokufaka Imali (SEP-24)",
    depositDesc:
      "Linganisa ukufaka imali ukuze uthole i-mZAR ngaphandle kwe-faucet.",
    depositButton: "Linganisa Ukufaka Imali",
    depositing: "Iyafaka imali...",
    connectPrompt: "Xhuma isikhwama ngaphezulu ukuze uhlole ukukhipha imali.",
  },
} as const;

export default function CashoutSimulator({
  locale,
  account,
}: {
  locale: "en" | "zu";
  account?: string | null;
}) {
  const text = copy[locale];
  const [rail, setRail] = useState<"instant_bank" | "mobile_money">(
    "instant_bank",
  );
  const [amount, setAmount] = useState<string>("250");
  const [recipient, setRecipient] = useState<string>("0820000000");
  const [bankName, setBankName] = useState<string>("Capitec (Simulated)");
  const [quote, setQuote] = useState<PayoutQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    id: string;
    amountOut: string;
    rail: string;
    externalId: string;
    stellarTx: string;
  } | null>(null);

  // Auto quote on load or change
  useEffect(() => {
    fetchQuote();
  }, [rail, amount]);

  function fetchQuote() {
    const parsed = parseFloat(amount) || 100;
    const fixedFee = rail === "instant_bank" ? 2.5 : 1.5;
    const percentRate = rail === "instant_bank" ? 0.005 : 0.0075;
    const percentFee = Math.round(parsed * percentRate * 100) / 100;
    const totalFee = Math.round((fixedFee + percentFee) * 100) / 100;
    const netPayout = Math.max(0, Math.round((parsed - totalFee) * 100) / 100);
    const estSeconds = rail === "instant_bank" ? 30 : 15;

    setQuote({
      rail,
      railLabel:
        rail === "instant_bank"
          ? "Simulated Bank Instant Payment (EFT/PayShap-style)"
          : "Simulated Mobile Money Payout",
      amountMzar: parsed,
      fixedFeeMzar: fixedFee,
      percentFeeMzar: percentFee,
      totalFeeMzar: totalFee,
      netPayoutMzar: netPayout,
      estimatedTimeToCashSeconds: estSeconds,
      timeToCashLabel: `~${estSeconds} seconds (Simulated)`,
      simulated: true,
      disclaimer:
        "SIMULATION ONLY: This is a demonstration flow on Stellar Testnet. No real South African rands or live bank transactions occur.",
    });
  }

  async function handleSimulateWithdrawal() {
    if (!account) return;
    setIsProcessing(true);
    setError(null);
    setSuccessResult(null);

    try {
      // Simulate fast interactive SEP-24 withdrawal flow (< 1 minute total)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setSuccessResult({
        id: `soc_w_${Date.now()}`,
        amountOut: quote ? quote.netPayoutMzar.toFixed(2) : amount,
        rail:
          rail === "instant_bank"
            ? `Instant Bank (${bankName})`
            : "Mobile Money Voucher",
        externalId: `SIM-EFT-${Math.floor(100000 + Math.random() * 900000)}`,
        stellarTx: `testnet_tx_${Math.random().toString(36).slice(2, 10)}`,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Simulated payout failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card className="cashout-simulator space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{text.title}</h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          {text.badge}
        </span>
      </div>

      <p className="text-sm opacity-80">{text.desc}</p>

      {!account && (
        <p className="text-sm italic opacity-75">{text.connectPrompt}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1">
            {text.railSelect}
          </label>
          <select
            className="w-full text-sm p-2 rounded border border-current/20 bg-transparent"
            value={rail}
            onChange={(e) =>
              setRail(e.target.value as "instant_bank" | "mobile_money")
            }
          >
            <option value="instant_bank">{text.bankOption}</option>
            <option value="mobile_money">{text.mobileOption}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            {text.amountLabel}
          </label>
          <input
            type="number"
            min="10"
            max="10000"
            className="w-full text-sm p-2 rounded border border-current/20 bg-transparent"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {rail === "instant_bank" && (
          <div>
            <label className="block text-xs font-semibold mb-1">
              {text.bankNameLabel}
            </label>
            <select
              className="w-full text-sm p-2 rounded border border-current/20 bg-transparent"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            >
              <option value="Capitec (Simulated)">Capitec (Simulated)</option>
              <option value="Standard Bank (Simulated)">
                Standard Bank (Simulated)
              </option>
              <option value="FNB (Simulated)">FNB (Simulated)</option>
              <option value="Nedbank (Simulated)">Nedbank (Simulated)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1">
            {text.recipientLabel}
          </label>
          <input
            type="text"
            className="w-full text-sm p-2 rounded border border-current/20 bg-transparent"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
      </div>

      {quote && (
        <div className="p-3 rounded bg-black/5 dark:bg-white/5 border border-current/10 space-y-2 text-xs">
          <div className="font-semibold text-sm">{text.feeSummaryTitle}</div>
          <div className="flex justify-between">
            <span className="opacity-75">{text.fixedFee}:</span>
            <span>R {quote.fixedFeeMzar.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-75">{text.percentFee}:</span>
            <span>R {quote.percentFeeMzar.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className="opacity-75">{text.totalFee}:</span>
            <span>R {quote.totalFeeMzar.toFixed(2)}</span>
          </div>
          <div className="border-t border-current/10 pt-1 flex justify-between font-bold text-sm">
            <span>{text.netPayout}:</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              R {quote.netPayoutMzar.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 text-xs">
            <span className="opacity-75">{text.timeToCash}:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {quote.timeToCashLabel}
            </span>
          </div>
        </div>
      )}

      {error && (
        <ErrorState title="Payout Simulation Error">{error}</ErrorState>
      )}

      {successResult && (
        <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
          <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>✅</span> {text.successTitle}
          </div>
          <div>
            <strong>Payout Value:</strong> R {successResult.amountOut} via{" "}
            {successResult.rail}
          </div>
          <div>
            <strong>{text.externalTx}:</strong>{" "}
            <code>{successResult.externalId}</code>
          </div>
          <div>
            <strong>{text.stellarTx}:</strong>{" "}
            <code>{successResult.stellarTx}</code>
          </div>
          <p className="text-[11px] opacity-75 italic pt-1">
            Zero real funds moved. All balances and references are strictly
            simulated for demonstration.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          variant="primary"
          onClick={handleSimulateWithdrawal}
          disabled={!account || isProcessing}
        >
          {isProcessing ? text.withdrawing : text.withdrawButton}
        </Button>
      </div>

      {isProcessing && <LoadingState label={text.withdrawing} />}
    </Card>
  );
}
