"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorState, LoadingState, Toast } from "./design-system";

export interface KeeperStatusDto {
  step: string;
  lifecycleState: "open" | "invested" | "matured" | "settled" | "closed";
  maturityTimestamp: number;
  timeRemainingSeconds: number;
  lastExecutionAt: number;
  retries: number;
  lastError?: string;
  history: Array<{
    timestamp: number;
    step: string;
    message: string;
    txHash?: string;
  }>;
}

const copy = {
  en: {
    title: "Hidden Admin & Keeper Demo Controls",
    badge: "ADMIN ONLY - TESTNET",
    desc: "Autonomous keeper daemon controls for live evaluation. Trigger lifecycle phases, fast-forward simulated maturity, or reset the demo state in a single click.",
    currentState: "Pot State Machine",
    timeRemaining: "Maturity Countdown",
    retries: "Retry Count",
    lastAction: "Last Action",
    stepButton: "Execute Next Keeper Step",
    fastForwardButton: "Fast-Forward Clock (+130s)",
    resetButton: "Reset Demo to Seed Baseline",
    historyTitle: "Keeper Execution Audit Trail",
    noHistory: "No events logged yet.",
  },
  zu: {
    title: "Izilawuli Zomqondisi Zesivivinyo (Keeper)",
    badge: "UMQONDISI KUPHELA",
    desc: "Izilawuli ezizenzakalelayo ze-keeper. Sheshisa isikhathi sokuvuthwa noma usethe kabusha isivivinyo ngokuchofoza okukodwa.",
    currentState: "Isimo Se-Pot",
    timeRemaining: "Ukubala Ukuvuthwa",
    retries: "Ukuzama Kabusha",
    lastAction: "Isenzo Sokugcina",
    stepButton: "Qhuba Isinyathelo Esilandelayo",
    fastForwardButton: "Sheshisa Isikhathi (+130s)",
    resetButton: "Setha Kabusha Isivivinyo",
    historyTitle: "Umlando Wezehlakalo Ze-Keeper",
    noHistory: "Ayikho imicimbi eqoshiwe.",
  },
} as const;

export default function AdminKeeperControls({
  locale,
}: {
  locale: "en" | "zu";
}) {
  const text = copy[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<KeeperStatusDto>({
    step: "idle",
    lifecycleState: "open",
    maturityTimestamp: Math.floor(Date.now() / 1000) + 120,
    timeRemainingSeconds: 120,
    lastExecutionAt: Date.now(),
    retries: 0,
    history: [
      {
        timestamp: Date.now(),
        step: "idle",
        message: "Keeper daemon initialized in Testnet mode.",
      },
    ],
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Poll keeper status simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setStatus((prev) => {
        const remaining = Math.max(0, prev.timeRemainingSeconds - 1);
        return {
          ...prev,
          timeRemainingSeconds: remaining,
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleExecuteStep() {
    setIsProcessing(true);
    setToastMessage(null);
    setTimeout(() => {
      setIsProcessing(false);
      setStatus((prev) => {
        if (prev.lifecycleState === "open") {
          return {
            ...prev,
            step: "waiting_for_maturity",
            lifecycleState: "invested",
            lastExecutionAt: Date.now(),
            history: [
              {
                timestamp: Date.now(),
                step: "investing",
                message:
                  "Dual-auth invest swap executed with primary dealer: 100 ZATBILL delivered.",
                txHash: "tx_mock_invest",
              },
              ...prev.history,
            ],
          };
        }
        if (prev.lifecycleState === "invested") {
          if (prev.timeRemainingSeconds > 0) {
            setToastMessage("Pot has not reached maturity date yet.");
            return prev;
          }
          return {
            ...prev,
            step: "claiming",
            lifecycleState: "settled",
            lastExecutionAt: Date.now(),
            history: [
              {
                timestamp: Date.now(),
                step: "settling",
                message:
                  "Pot matured & settled by primary dealer at face value in mZAR.",
                txHash: "tx_mock_settle",
              },
              ...prev.history,
            ],
          };
        }
        if (prev.lifecycleState === "settled") {
          return {
            ...prev,
            step: "completed",
            lifecycleState: "closed",
            lastExecutionAt: Date.now(),
            history: [
              {
                timestamp: Date.now(),
                step: "completed",
                message:
                  "Member pro-rata shares claimed. Demo pot closed successfully.",
                txHash: "tx_mock_claim",
              },
              ...prev.history,
            ],
          };
        }
        return prev;
      });
      setToastMessage("Keeper cycle step executed.");
    }, 600);
  }

  function handleFastForward() {
    setStatus((prev) => ({
      ...prev,
      timeRemainingSeconds: 0,
      history: [
        {
          timestamp: Date.now(),
          step: prev.step,
          message: "Simulated clock fast-forwarded by +130s. Maturity reached.",
        },
        ...prev.history,
      ],
    }));
    setToastMessage("Clock fast-forwarded past maturity (0s remaining).");
  }

  function handleReset() {
    setStatus({
      step: "idle",
      lifecycleState: "open",
      maturityTimestamp: Math.floor(Date.now() / 1000) + 120,
      timeRemainingSeconds: 120,
      lastExecutionAt: Date.now(),
      retries: 0,
      history: [
        {
          timestamp: Date.now(),
          step: "idle",
          message: "Demo reset executed: Baseline seed state restored.",
        },
      ],
    });
    setToastMessage("Demo reset: Baseline clean seed state restored.");
  }

  return (
    <div className="border border-current/20 rounded p-3 bg-black/5 dark:bg-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 opacity-80 hover:opacity-100"
        >
          <span>⚙️</span> {text.title}
          <span>{isOpen ? "▲" : "▼"}</span>
        </button>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          {text.badge}
        </span>
      </div>

      {isOpen && (
        <div className="space-y-4 pt-2 border-t border-current/10">
          <p className="text-xs opacity-75">{text.desc}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-current/10">
              <span className="block opacity-60 text-[10px]">
                {text.currentState}
              </span>
              <strong className="uppercase font-mono text-purple-600 dark:text-purple-400">
                {status.lifecycleState}
              </strong>
            </div>

            <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-current/10">
              <span className="block opacity-60 text-[10px]">
                {text.timeRemaining}
              </span>
              <strong className="font-mono">
                {status.timeRemainingSeconds}s
              </strong>
            </div>

            <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-current/10">
              <span className="block opacity-60 text-[10px]">
                {text.retries}
              </span>
              <strong className="font-mono">{status.retries} / 3</strong>
            </div>

            <div className="p-2 rounded bg-black/5 dark:bg-white/5 border border-current/10">
              <span className="block opacity-60 text-[10px]">
                {text.lastAction}
              </span>
              <strong className="font-mono text-[11px]">
                {new Date(status.lastExecutionAt).toLocaleTimeString()}
              </strong>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleExecuteStep}
              disabled={isProcessing}
              className="text-xs"
            >
              {isProcessing ? "Executing..." : text.stepButton}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleFastForward}
              className="text-xs text-blue-600 dark:text-blue-400"
            >
              {text.fastForwardButton}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              className="text-xs text-rose-600 dark:text-rose-400"
            >
              {text.resetButton}
            </Button>
          </div>

          {toastMessage && (
            <Toast title="Admin Operation" variant="info">
              {toastMessage}
            </Toast>
          )}

          {/* Execution audit log */}
          <div className="space-y-1.5 pt-1">
            <h4 className="text-xs font-semibold">{text.historyTitle}</h4>
            <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono border border-current/10 rounded p-2 bg-black/5 dark:bg-white/5">
              {status.history.map((ev, i) => (
                <div key={i} className="flex items-start gap-1.5 opacity-80">
                  <span className="opacity-50">
                    [{new Date(ev.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    [{ev.step}]
                  </span>
                  <span className="break-all">{ev.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
