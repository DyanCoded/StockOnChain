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

export const kycCopy = {
  en: {
    title: "Identity check (demo)",
    desc: "Complete the sample identity check to enable demo access. This check is simulated and does not verify a real identity.",
    statusLabel: "Demo access",
    statusUnverified: "Not verified yet",
    statusVerified: "Verified for this demo",
    statusRevoked: "Demo access paused",
    syntheticId: "South African ID (Synthetic)",
    syntheticIdPlaceholder: "13-digit synthetic ID (e.g. 9001015000085)",
    fillSynthetic: "Use Sample Synthetic ID",
    phone: "Mobile Number",
    phonePlaceholder: "e.g. 0820000000",
    otp: "6-Digit Verification PIN (OTP)",
    consent:
      "I consent to simulated identity verification for testing under POPIA data protection guidelines.",
    popiaNote:
      "POPIA Compliance: Only synthetic data is processed. Zero personal documents, real ID numbers, or phone numbers are logged or stored.",
    verifyButton: "Verify sample details",
    verifying: "Checking sample details...",
    verifySuccess: "Verified for this demo. Sample access is active.",
    claimTitle: "Receive Demo ZATBILL",
    claimDesc:
      "Test token transfer from the dealer. Unverified or frozen accounts are rejected on-chain by the issuer's compliance flags.",
    claimButton: "Claim 1 Demo ZATBILL",
    claiming: "Submitting transfer...",
    adminTitle: "Compliance Admin Controls (Demo Simulation)",
    adminDesc:
      "Test freezing and re-authorizing compliance access on Stellar Testnet.",
    freezeButton: "Freeze Account (Admin Revocation)",
    freezing: "Revoking authorization on Testnet...",
    reauthButton: "Restore Authorization",
    reauthing: "Re-authorizing on Testnet...",
    unverifiedError:
      "Not verified yet. Demo access is unavailable until the sample check and account setup are complete.",
    revokedError:
      "Not verified yet. Demo access for this profile has been paused by an administrator.",
    connectPrompt:
      "Connect a wallet above to test simulated compliance allowlisting and transfers.",
    transferredSuccess: "Received 1.00 demo ZATBILL successfully.",
    viewOnExplorer: "View transaction on Horizon Testnet",
  },
  zu: {
    title: "Ukuhlolwa kobuwena (isivivinyo)",
    desc: "Qedela ukuhlola kobuwena besampula ukuze uthole ukufinyelela kwesivivinyo. Lokhu akuhloli ubuwena bangempela.",
    statusLabel: "Ukufinyelela kwesivivinyo",
    statusUnverified: "Awukaqinisekiswa",
    statusVerified: "Uqinisekisiwe kulesi sivivinyo",
    statusRevoked: "Ukufinyelela kwesivivinyo kumisiwe",
    syntheticId: "Inombolo Kamazisi WaseNingizimu Afrika (Yokulingisa)",
    syntheticIdPlaceholder:
      "Izinombolo eziyi-13 zokulingisa (isib. 9001015000085)",
    fillSynthetic: "Sebenzisa Umazisi Wokulingisa",
    phone: "Inombolo Yeselula",
    phonePlaceholder: "isib. 0820000000",
    otp: "I-PIN Yokuqinisekisa (OTP)",
    consent:
      "Ngiyavuma ukuhlolwa kobuwena bokulingisa ngaphansi kwemihlahlandlela ye-POPIA.",
    popiaNote:
      "Ukuvikelwa Kwedatha (POPIA): Kusetshenziswa idatha yokulingisa kuphela. Ayikho imininingwane yangempela egcinwayo noma ebhalwayo.",
    verifyButton: "Hlola imininingwane yesampula",
    verifying: "Ihlola imininingwane yesampula...",
    verifySuccess:
      "Uqinisekisiwe kulesi sivivinyo. Ukufinyelela kwesampula kuyasebenza.",
    claimTitle: "Thola i-ZATBILL Yesivivinyo",
    claimDesc:
      "Hlola ukudluliswa kwethokheni. Ama-akhawunti angaqinisekiswanga noma amisiwe anqatshwa ku-chain ngenxa yemithetho ye-compliance.",
    claimButton: "Funa i-1 ZATBILL Yesivivinyo",
    claiming: "Iyadlulisa...",
    adminTitle: "Izilawuli Zomqondisi (Isivivinyo)",
    adminDesc: "Hlola ukumisa nokubuyisela ukugunyazwa ku-Stellar Testnet.",
    freezeButton: "Misa I-akhawunti (Ukuvimbela)",
    freezing: "Iyamisa ku-Testnet...",
    reauthButton: "Buyisela Ukugunyazwa",
    reauthing: "Iyagunyaza futhi...",
    unverifiedError:
      "Awukaqinisekiswa. Ukufinyelela kwesivivinyo akutholakali kuze kuqedwe ukuhlola kwesampula nokusethwa kwe-akhawunti.",
    revokedError:
      "Awukaqinisekiswa. Ukufinyelela kwesivivinyo sale phrofayela kumiswe umlawuli.",
    connectPrompt:
      "Xhuma isikhwama ngaphezulu ukuze uhlole ukugunyazwa kwe-compliance.",
    transferredSuccess:
      "Kutholwe i-ZATBILL yesivivinyo engu-1.00 ngempumelelo.",
    viewOnExplorer: "Buka ukuthengiselana ku-Horizon Testnet",
  },
} as const;

export default function KycAllowlist({
  locale,
  account,
}: {
  locale: "en" | "zu";
  account: string | null;
}) {
  const t = kycCopy[locale];

  const [status, setStatus] = useState<"unverified" | "verified" | "revoked">(
    "unverified",
  );
  const [balance, setBalance] = useState<string>("0");
  const [hasTrustline, setHasTrustline] = useState<boolean>(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);

  // Form inputs
  const [idNumber, setIdNumber] = useState<string>("9001015000085");
  const [phone, setPhone] = useState<string>("0820000000");
  const [otp, setOtp] = useState<string>("123456");
  const [consent, setConsent] = useState<boolean>(false);

  // Actions state
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isFreezing, setIsFreezing] = useState<boolean>(false);

  // Results & Errors
  const [claimError, setClaimError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [claimSuccessHash, setClaimSuccessHash] = useState<string | null>(null);

  // Fetch status on account change
  useEffect(() => {
    if (!account) {
      setStatus("unverified");
      setClaimError(null);
      setVerifyError(null);
      setVerifySuccess(null);
      setClaimSuccessHash(null);
      return;
    }
    let isMounted = true;
    setIsLoadingStatus(true);
    fetch(`/api/kyc/status?account=${account}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.onchain?.hasTrustline && data?.onchain?.isAuthorized) {
          setStatus("verified");
        } else if (
          data?.revokedAt ||
          (data?.onchain?.hasTrustline && !data?.onchain?.isAuthorized)
        ) {
          setStatus(data?.revokedAt ? "revoked" : "unverified");
        } else {
          setStatus(data?.verified ? "verified" : "unverified");
        }
        if (data?.onchain?.balance) {
          setBalance(data.onchain.balance);
        }
        if (data?.onchain?.hasTrustline !== undefined) {
          setHasTrustline(data.onchain.hasTrustline);
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        if (isMounted) setIsLoadingStatus(false);
      });

    return () => {
      isMounted = false;
    };
  }, [account]);

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!account) return;
    setIsVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);
    setClaimError(null);

    try {
      const res = await fetch("/api/kyc/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          idNumber,
          phone,
          otp,
          consent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.authorized) {
        throw new Error(data.error || t.unverifiedError);
      }
      setStatus("verified");
      setHasTrustline(true);
      setVerifySuccess(t.verifySuccess);
    } catch (err: unknown) {
      setVerifyError(
        err instanceof Error ? err.message : "Verification failed",
      );
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleClaim() {
    if (!account) return;
    setIsClaiming(true);
    setClaimError(null);
    setClaimSuccessHash(null);

    try {
      const res = await fetch("/api/zatbill/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: account, amount: "1" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (
          data?.reason?.includes("op_not_authorized") ||
          data?.code === "UNAUTHORIZED_RECIPIENT"
        ) {
          if (status === "revoked") {
            setClaimError(t.revokedError);
          } else {
            setClaimError(t.unverifiedError);
          }
          return;
        }
        throw new Error(data.error || "Transfer failed");
      }
      setClaimSuccessHash(data.transactionHash);
      setBalance((prev) => String(Number(prev || 0) + 1));
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsClaiming(false);
    }
  }

  async function handleRevoke() {
    if (!account) return;
    setIsFreezing(true);
    setVerifyError(null);
    setClaimError(null);

    try {
      const res = await fetch("/api/kyc/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Revocation failed");
      }
      setStatus("revoked");
      setVerifySuccess(null);
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : "Revocation failed");
    } finally {
      setIsFreezing(false);
    }
  }

  if (!account) {
    return (
      <Card title={t.title} className="mt-6">
        <p className="text-sm opacity-80 mb-2">{t.desc}</p>
        <p className="text-sm italic">{t.connectPrompt}</p>
      </Card>
    );
  }

  return (
    <Card title={t.title} className="mt-6">
      <p className="text-sm opacity-80 mb-4">{t.desc}</p>

      {/* Status indicator */}
      <div className="mb-4 flex items-center justify-between p-3 rounded bg-black/5 dark:bg-white/5 border border-current/10">
        <div>
          <span className="text-xs uppercase tracking-wider block opacity-70">
            {t.statusLabel}
          </span>
          <span className="font-bold text-sm">
            {status === "verified" && (
              <span className="text-emerald-600 dark:text-emerald-400">
                ● {t.statusVerified}
              </span>
            )}
            {status === "unverified" && (
              <span className="text-amber-600 dark:text-amber-400">
                ○ {t.statusUnverified}
              </span>
            )}
            {status === "revoked" && (
              <span className="text-rose-600 dark:text-rose-400">
                ✕ {t.statusRevoked}
              </span>
            )}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-wider block opacity-70">
            ZATBILL Balance
          </span>
          <span className="font-mono text-sm font-semibold">
            {balance} ZATBILL
          </span>
        </div>
      </div>

      {isLoadingStatus && (
        <LoadingState label="Checking onchain allowlist..." />
      )}

      {/* Verification Form (shown when unverified) */}
      {status === "unverified" && (
        <form
          onSubmit={handleVerify}
          className="space-y-3 mb-6 p-4 rounded border border-current/10"
        >
          <h4 className="font-semibold text-sm">Simulated South African KYC</h4>

          <div>
            <label
              className="block text-xs font-medium opacity-80 mb-1"
              htmlFor="kyc-id"
            >
              {t.syntheticId}
            </label>
            <input
              id="kyc-id"
              type="text"
              className="w-full text-sm p-2 rounded border bg-transparent font-mono"
              value={idNumber}
              readOnly
              placeholder={t.syntheticIdPlaceholder}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-medium opacity-80 mb-1"
                htmlFor="kyc-phone"
              >
                {t.phone}
              </label>
              <input
                id="kyc-phone"
                type="text"
                className="w-full text-sm p-2 rounded border bg-transparent font-mono"
                value={phone}
                readOnly
                placeholder={t.phonePlaceholder}
                required
              />
            </div>
            <div>
              <label
                className="block text-xs font-medium opacity-80 mb-1"
                htmlFor="kyc-otp"
              >
                {t.otp}
              </label>
              <input
                id="kyc-otp"
                type="text"
                className="w-full text-sm p-2 rounded border bg-transparent font-mono"
                value={otp}
                readOnly
                required
              />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <input
              id="popia-consent"
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            <label htmlFor="popia-consent" className="text-base leading-normal">
              {t.consent}
            </label>
          </div>

          <p className="text-base text-amber-900 bg-amber-50 p-3 rounded">
            {t.popiaNote}
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isVerifying || !consent}
            >
              {isVerifying ? t.verifying : t.verifyButton}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIdNumber("9001015000085");
                setPhone("0820000000");
                setOtp("123456");
                setConsent(true);
              }}
            >
              {t.fillSynthetic}
            </Button>
          </div>
        </form>
      )}

      {/* Verification alerts */}
      {verifyError && (
        <ErrorState title="Verification failed">{verifyError}</ErrorState>
      )}
      {verifySuccess && (
        <Toast title="Allowlist Authorized">{verifySuccess}</Toast>
      )}

      {/* Test Receive / Claim Action */}
      <div className="my-5 p-4 rounded border border-current/10 bg-black/5 dark:bg-white/5">
        <h4 className="font-semibold text-sm mb-1">{t.claimTitle}</h4>
        <p className="text-xs opacity-80 mb-3">{t.claimDesc}</p>

        <Button
          type="button"
          variant="primary"
          onClick={handleClaim}
          disabled={isClaiming}
        >
          {isClaiming ? t.claiming : t.claimButton}
        </Button>

        {claimError && (
          <div className="mt-3">
            <ErrorState title={t.statusUnverified}>{claimError}</ErrorState>
          </div>
        )}

        {claimSuccessHash && (
          <div className="mt-3 space-y-1">
            <TransactionStatus label={t.transferredSuccess} />
            <a
              href={`https://horizon-testnet.stellar.org/transactions/${claimSuccessHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 underline block"
            >
              {t.viewOnExplorer} ({claimSuccessHash.slice(0, 8)}...
              {claimSuccessHash.slice(-8)})
            </a>
          </div>
        )}
      </div>

      {/* Admin Demo Revocation Controls */}
      <div className="mt-4 pt-4 border-t border-current/10">
        <h4 className="font-semibold text-xs uppercase tracking-wider opacity-70 mb-1">
          {t.adminTitle}
        </h4>
        <p className="text-xs opacity-75 mb-3">{t.adminDesc}</p>

        <div className="flex flex-wrap gap-2">
          {status === "verified" && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleRevoke}
              disabled={isFreezing}
              className="text-xs text-rose-600 border-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              {isFreezing ? t.freezing : t.freezeButton}
            </Button>
          )}

          {status === "revoked" && (
            <Button
              type="button"
              variant="primary"
              onClick={() => handleVerify()}
              disabled={isVerifying}
              className="text-xs"
            >
              {isVerifying ? t.reauthing : t.reauthButton}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
