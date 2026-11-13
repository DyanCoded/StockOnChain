"use client";

import { useEffect, useState } from "react";
import { Button, ErrorState, LoadingState } from "./design-system";
import KycAllowlist from "./kyc-allowlist";
import CashoutSimulator from "./cashout-simulator";

const walletText = {
  en: {
    connect: "Connect Freighter",
    useDemo: "Use Demo Wallet (Custodial-lite)",
    disconnect: "Disconnect",
    connecting: "Connecting...",
    errorTitle: "Wallet connection unavailable",
    loading: "Waiting for Freighter approval.",
    error:
      "Could not connect. Check that Freighter is available and try again.",
    demoNotice: "Custodial-lite demo wallet active on Stellar Testnet.",
  },
  zu: {
    connect: "Xhuma kuFreighter",
    useDemo: "Sebenzisa Isikhwama Sesivivinyo (Custodial-lite)",
    disconnect: "Nqamula",
    connecting: "Iyaxhuma...",
    errorTitle: "Ukuxhuma isikhwama akutholakali",
    loading: "Ilinde imvume yeFreighter.",
    error:
      "Ayikwazanga ukuxhuma. Hlola ukuthi iFreighter iyatholakala yini bese uzama futhi.",
    demoNotice:
      "Isikhwama sesivivinyo se-custodial-lite siyasebenza ku-Stellar Testnet.",
  },
} as const;

export default function AdvancedWallet({ locale }: { locale: "en" | "zu" }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [kitInitialized, setKitInitialized] = useState(false);
  const [isDemoWallet, setIsDemoWallet] = useState(false);
  const text = walletText[locale];

  // Check if a demo wallet exists in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("soc_demo_pubkey");
      if (stored && stored.startsWith("G") && stored.length === 56) {
        setAddress(stored);
        setIsDemoWallet(true);
      }
    } catch {
      // Ignore
    }
  }, []);

  async function connectFreighter() {
    setIsConnecting(true);
    setWalletError(null);
    try {
      const [sdk, wallet, types] = await Promise.all([
        import("@creit.tech/stellar-wallets-kit/sdk"),
        import("@creit.tech/stellar-wallets-kit/modules/freighter"),
        import("@creit.tech/stellar-wallets-kit/types"),
      ]);
      const activeKit = sdk.StellarWalletsKit;
      if (!kitInitialized) {
        activeKit.init({
          modules: [new wallet.VarialModule()],
          network: types.Networks.TESTNET,
        });
        setKitInitialized(true);
      }
      const { address: walletAddress } = await activeKit.authModal();
      setAddress(walletAddress);
      setIsDemoWallet(false);
      try {
        localStorage.removeItem("soc_demo_pubkey");
      } catch {
        // Ignore
      }
    } catch {
      setWalletError(text.error);
    } finally {
      setIsConnecting(false);
    }
  }

  async function createOrLoadDemoWallet() {
    setWalletError(null);
    try {
      const { Keypair } = await import("@stellar/stellar-sdk");
      let storedPubkey = "";
      try {
        storedPubkey = localStorage.getItem("soc_demo_pubkey") || "";
      } catch {
        // Ignore
      }

      if (
        !storedPubkey ||
        !storedPubkey.startsWith("G") ||
        storedPubkey.length !== 56
      ) {
        const pair = Keypair.random();
        storedPubkey = pair.publicKey();
        try {
          localStorage.setItem("soc_demo_pubkey", storedPubkey);
        } catch {
          // Ignore
        }
      }

      setAddress(storedPubkey);
      setIsDemoWallet(true);
    } catch (err: unknown) {
      setWalletError(
        err instanceof Error ? err.message : "Failed to create demo wallet.",
      );
    }
  }

  async function disconnectWallet() {
    try {
      if (!isDemoWallet) {
        const { StellarWalletsKit } =
          await import("@creit.tech/stellar-wallets-kit/sdk");
        await StellarWalletsKit.disconnect();
      } else {
        localStorage.removeItem("soc_demo_pubkey");
      }
      setAddress(null);
      setIsDemoWallet(false);
    } catch {
      setWalletError(text.error);
    }
  }

  return (
    <div className="space-y-4">
      {address ? (
        <div className="wallet-status space-y-2">
          <div className="flex items-center justify-between gap-2 p-3 rounded bg-black/5 dark:bg-white/5 border border-current/10">
            <div>
              <span className="text-xs uppercase tracking-wider block opacity-70">
                {isDemoWallet
                  ? "Demo Wallet (Custodial-lite)"
                  : "Freighter Wallet"}
              </span>
              <code className="text-xs font-mono break-all">{address}</code>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={disconnectWallet}
              className="text-xs"
            >
              {text.disconnect}
            </Button>
          </div>
          {isDemoWallet && (
            <p className="text-xs italic opacity-75">{text.demoNotice}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={connectFreighter}
            disabled={isConnecting}
          >
            {text.connect}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={createOrLoadDemoWallet}
            disabled={isConnecting}
          >
            {text.useDemo}
          </Button>
        </div>
      )}

      {isConnecting && <LoadingState label={text.loading} />}
      {walletError && (
        <ErrorState title={text.errorTitle}>{walletError}</ErrorState>
      )}

      {/* Compliance KYC & Allowlist Component */}
      <KycAllowlist locale={locale} account={address} />

      {/* Simulated Cash-Out & SEP-24 Local Rails */}
      <CashoutSimulator locale={locale} account={address} />
    </div>
  );
}
