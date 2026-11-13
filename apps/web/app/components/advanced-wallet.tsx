"use client";

import { useState } from "react";
import { Button, ErrorState, LoadingState } from "./design-system";

const walletText = {
  en: {
    connect: "Connect Freighter",
    disconnect: "Disconnect",
    connecting: "Connecting...",
    errorTitle: "Wallet connection unavailable",
    loading: "Waiting for Freighter approval.",
    error:
      "Could not connect. Check that Freighter is available and try again.",
  },
  zu: {
    connect: "Xhuma kuFreighter",
    disconnect: "Nqamula",
    connecting: "Iyaxhuma...",
    errorTitle: "Ukuxhuma isikhwama akutholakali",
    loading: "Ilinde imvume yeFreighter.",
    error:
      "Ayikwazanga ukuxhuma. Hlola ukuthi iFreighter iyatholakala yini bese uzama futhi.",
  },
} as const;

export default function AdvancedWallet({ locale }: { locale: "en" | "zu" }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [kitInitialized, setKitInitialized] = useState(false);
  const text = walletText[locale];

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
    } catch {
      setWalletError(text.error);
    } finally {
      setIsConnecting(false);
    }
  }

  async function disconnectWallet() {
    try {
      const { StellarWalletsKit } =
        await import("@creit.tech/stellar-wallets-kit/sdk");
      await StellarWalletsKit.disconnect();
      setAddress(null);
    } catch {
      setWalletError(text.error);
    }
  }

  return (
    <>
      {address ? (
        <div className="wallet-status">
          <code>{address}</code>
          <Button type="button" variant="secondary" onClick={disconnectWallet}>
            {text.disconnect}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onClick={connectFreighter}
          disabled={isConnecting}
        >
          {text.connect}
        </Button>
      )}
      {isConnecting && <LoadingState label={text.loading} />}
      {walletError && (
        <ErrorState title={text.errorTitle}>{walletError}</ErrorState>
      )}
    </>
  );
}
