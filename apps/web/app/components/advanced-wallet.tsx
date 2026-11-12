"use client";

import { useState } from "react";

const walletText = {
  en: {
    connect: "Connect Freighter",
    disconnect: "Disconnect",
    connecting: "Connecting...",
    error:
      "Could not connect. Check that Freighter is available and try again.",
  },
  zu: {
    connect: "Xhuma kuFreighter",
    disconnect: "Nqamula",
    connecting: "Iyaxhuma...",
    error:
      "Ayikwazanga ukuxhuma. Hlola ukuthi iFreighter iyatholakala yini bese uzama futhi.",
  },
} as const;

export default function AdvancedWallet({
  locale,
}: {
  locale: "en" | "zu";
}) {
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
          <button type="button" onClick={disconnectWallet}>
            {text.disconnect}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={connectFreighter}
          disabled={isConnecting}
        >
          {isConnecting ? text.connecting : text.connect}
        </button>
      )}
      {walletError && <p role="alert">{walletError}</p>}
    </>
  );
}