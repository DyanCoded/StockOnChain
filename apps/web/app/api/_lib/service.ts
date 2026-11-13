import { Asset, Horizon, Keypair } from "@stellar/stellar-sdk";
import {
  KycService,
  KycStore,
  validateSouthAfricanId,
  validatePhoneNumber,
  validateOtp,
  generateSyntheticSouthAfricanId,
} from "@stockonchain/api/kyc";

let kycServiceInstance: KycService | null = null;
let sharedKycStore: KycStore | null = null;

export function getSharedKycStore(): KycStore {
  if (!sharedKycStore) {
    sharedKycStore = new KycStore();
  }
  return sharedKycStore;
}

export function getKycService(): KycService | null {
  if (kycServiceInstance) {
    return kycServiceInstance;
  }

  const zatbillIssuerSecret =
    process.env.STELLAR_ZATBILL_ISSUER_SECRET_KEY?.trim();
  const sponsorSecret = process.env.STELLAR_SPONSOR_SECRET_KEY?.trim();
  const dealerSecret = process.env.STELLAR_DEALER_SECRET_KEY?.trim();

  if (!zatbillIssuerSecret || !sponsorSecret || !dealerSecret) {
    return null;
  }

  try {
    const zatbillIssuer = Keypair.fromSecret(zatbillIssuerSecret);
    const sponsor = Keypair.fromSecret(sponsorSecret);
    const dealer = Keypair.fromSecret(dealerSecret);
    const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
    const zatbillAsset = new Asset("ZATBILL", zatbillIssuer.publicKey());
    const kycStore = getSharedKycStore();

    kycServiceInstance = new KycService({
      issuerKeypair: zatbillIssuer,
      sponsorKeypair: sponsor,
      dealerKeypair: dealer,
      horizon,
      zatbillAsset,
      kycStore,
    });
    return kycServiceInstance;
  } catch (error) {
    console.error("Failed to initialize in-process KYC service:", error);
    return null;
  }
}

export async function proxyOrExecute(
  pathname: string,
  method: string,
  body?: unknown,
  search?: string,
): Promise<{ status: number; data: unknown } | null> {
  const apiUrl = process.env.API_URL || "http://127.0.0.1:3001";
  try {
    const targetUrl = `${apiUrl}${pathname}${search ? `?${search}` : ""}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(targetUrl, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return { status: res.status, data };
  } catch {
    return null;
  }
}

export {
  validateSouthAfricanId,
  validatePhoneNumber,
  validateOtp,
  generateSyntheticSouthAfricanId,
};
