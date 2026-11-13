/**
 * @stockonchain/chain - Safe Failure State Mappings (T-08)
 *
 * Maps Soroban contract revert codes, Horizon transaction errors,
 * and network guardrail failures to user-friendly plain-language messages
 * designed for UI consumption in task A-07.
 */

export type PotFailureReasonCode =
  | "UNVERIFIED_TRANSFER"
  | "FROZEN_ACCOUNT"
  | "NOT_MEMBER"
  | "OVER_CAP"
  | "NOT_MATURED"
  | "ALREADY_CLAIMED"
  | "WRONG_NETWORK"
  | "EXCEEDS_ATTESTED_RESERVES"
  | "PAUSED"
  | "ZERO_AMOUNT"
  | "WRONG_STATE"
  | "NOT_ADMIN"
  | "NOT_DEALER"
  | "UNKNOWN_ERROR";

export interface PotSafeError {
  code: PotFailureReasonCode;
  title: string;
  userMessage: string;
  technicalDetails?: string;
  remedy: string;
}

export const SAFE_FAILURE_DEFINITIONS: Record<
  PotFailureReasonCode,
  Omit<PotSafeError, "technicalDetails">
> = {
  UNVERIFIED_TRANSFER: {
    code: "UNVERIFIED_TRANSFER",
    title: "KYC Verification & Trustline Required",
    userMessage:
      "This wallet cannot receive ZATBILL tokens because it has not completed compliance verification or its compliance trustline is not authorized.",
    remedy:
      "Complete the simulated KYC verification flow to authorize the ZATBILL trustline before receiving tokens.",
  },
  FROZEN_ACCOUNT: {
    code: "FROZEN_ACCOUNT",
    title: "Account Compliance Frozen",
    userMessage:
      "Transfers are temporarily blocked because compliance authorization for this wallet has been frozen or revoked by the asset issuer.",
    remedy:
      "Contact the stokvel administrator or re-complete KYC compliance verification to unfreeze your account.",
  },
  NOT_MEMBER: {
    code: "NOT_MEMBER",
    title: "Not an Enrolled Pot Member",
    userMessage:
      "Your contribution was declined because this wallet is not an approved member of this Stokvel Pot.",
    remedy:
      "Request the stokvel administrator to enroll your wallet address into the pot member roster.",
  },
  OVER_CAP: {
    code: "OVER_CAP",
    title: "Contribution Cap Exceeded",
    userMessage:
      "Your contribution was declined because the amount exceeds the maximum per-member deposit cap configured for this pot.",
    remedy:
      "Reduce your contribution amount so that your total deposited balance does not exceed the member cap.",
  },
  NOT_MATURED: {
    code: "NOT_MATURED",
    title: "Pot Has Not Reached Maturity",
    userMessage:
      "Claims cannot be processed because this Stokvel Pot has not reached its maturity date yet.",
    remedy:
      "Wait until the maturity timestamp passes and the pot has been settled before claiming your payout.",
  },
  ALREADY_CLAIMED: {
    code: "ALREADY_CLAIMED",
    title: "Payout Already Claimed",
    userMessage:
      "You have already claimed your full pro-rata payout for this pot. Duplicate claims are strictly prohibited.",
    remedy:
      "No action required. Your payout has already been transferred to your wallet in full.",
  },
  WRONG_NETWORK: {
    code: "WRONG_NETWORK",
    title: "Unsupported Stellar Network",
    userMessage:
      "Operation rejected: StockOnChain is strictly configured for the Stellar Testnet. Mainnet or mismatched passphrases are blocked.",
    remedy:
      "Switch your wallet and environment configuration to the Stellar Testnet ('Test SDF Network ; September 2015').",
  },
  EXCEEDS_ATTESTED_RESERVES: {
    code: "EXCEEDS_ATTESTED_RESERVES",
    title: "Attested Reserve Limit Exceeded",
    userMessage:
      "The investment was blocked because the required ZATBILL purchase exceeds the cryptographic reserve ceiling attested onchain by the custodian.",
    remedy:
      "Wait for the custodian to attest additional reserves or adjust the investment batch size.",
  },
  PAUSED: {
    code: "PAUSED",
    title: "Pot Operations Paused",
    userMessage:
      "Operations on this pot are temporarily paused by the administrator for safety.",
    remedy:
      "Please check back once the administrator resumes pot operations.",
  },
  ZERO_AMOUNT: {
    code: "ZERO_AMOUNT",
    title: "Invalid Deposit Amount",
    userMessage:
      "Contributions or transfers of zero amount are not permitted.",
    remedy:
      "Enter a positive amount greater than zero.",
  },
  WRONG_STATE: {
    code: "WRONG_STATE",
    title: "Invalid Pot State",
    userMessage:
      "The requested action cannot be performed because the pot is in a different lifecycle state.",
    remedy:
      "Ensure the pot is in the correct state (Open, Invested, Matured, or Settled) before attempting this operation.",
  },
  NOT_ADMIN: {
    code: "NOT_ADMIN",
    title: "Administrator Privileges Required",
    userMessage:
      "This operation can only be executed by the authorized pot administrator.",
    remedy:
      "Sign the transaction using the configured administrator keypair.",
  },
  NOT_DEALER: {
    code: "NOT_DEALER",
    title: "Primary Dealer Authorization Required",
    userMessage:
      "This operation requires authorization from the registered primary dealer.",
    remedy:
      "Ensure the registered primary dealer keypair signs this operation.",
  },
  UNKNOWN_ERROR: {
    code: "UNKNOWN_ERROR",
    title: "Unexpected Operation Failure",
    userMessage:
      "The transaction failed to execute. Please verify network connectivity and account state.",
    remedy:
      "Review the transaction details and retry after ensuring account balances and trustlines are active.",
  },
};

/**
 * Extracts numeric Soroban ContractError code from error objects, strings, or CLI outputs.
 */
export function extractContractErrorCode(error: unknown): number | null {
  if (!error) return null;
  const str =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? `${error.message}\n${(error as { stack?: string }).stack || ""}`
        : JSON.stringify(error);

  // Common Soroban CLI and SDK pattern matches:
  // e.g. "Error(Contract, #6)", "ContractError(6)", "error code: 6", "Error::NotMember"
  const contractNumMatch = str.match(/(?:Contract,\s*#|ContractError\(|error code:\s*)(\d+)/i);
  if (contractNumMatch?.[1]) {
    return parseInt(contractNumMatch[1], 10);
  }

  // Name matches
  if (/NotMember/i.test(str)) return 6;
  if (/OverCap/i.test(str)) return 7;
  if (/Paused/i.test(str)) return 8;
  if (/WrongState/i.test(str)) return 9;
  if (/ZeroAmount/i.test(str)) return 10;
  if (/NotMatured/i.test(str)) return 11;
  if (/AlreadyClaimed/i.test(str)) return 12;
  if (/ZeroBalance/i.test(str)) return 13;
  if (/InsufficientBacking/i.test(str)) return 14;
  if (/InvalidDiscount/i.test(str)) return 15;
  if (/AlreadyMember/i.test(str)) return 16;
  if (/Unauthorized/i.test(str)) return 17;
  if (/ExceedsAttestedReserves/i.test(str)) return 18;
  if (/InvalidTimestamp/i.test(str)) return 19;
  if (/NotAdmin/i.test(str)) return 3;
  if (/NotDealer/i.test(str)) return 4;
  if (/NotCustodian/i.test(str)) return 5;

  return null;
}

/**
 * Maps any error (Soroban revert, Horizon rejection, Network guardrail) to a PotSafeError.
 */
export function mapFailureToSafeError(
  error: unknown,
  context?: {
    isFrozen?: boolean;
    isUnverified?: boolean;
    technicalDetails?: string;
  },
): PotSafeError {
  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : JSON.stringify(error);

  const technical = context?.technicalDetails || rawMessage;

  // 1. Network checks
  if (
    /network.*must be explicitly set to testnet/i.test(rawMessage) ||
    /does not match Stellar Testnet/i.test(rawMessage) ||
    /wrong network/i.test(rawMessage)
  ) {
    return {
      ...SAFE_FAILURE_DEFINITIONS.WRONG_NETWORK,
      technicalDetails: technical,
    };
  }

  // 2. Horizon Classic Trustline & Authorization checks
  if (
    /op_not_authorized/i.test(rawMessage) ||
    /op_no_trust/i.test(rawMessage) ||
    context?.isFrozen ||
    context?.isUnverified
  ) {
    if (context?.isFrozen || /frozen|revoked/i.test(rawMessage)) {
      return {
        ...SAFE_FAILURE_DEFINITIONS.FROZEN_ACCOUNT,
        technicalDetails: technical,
      };
    }
    return {
      ...SAFE_FAILURE_DEFINITIONS.UNVERIFIED_TRANSFER,
      technicalDetails: technical,
    };
  }

  // 3. Soroban contract error codes
  const code = extractContractErrorCode(error);
  switch (code) {
    case 3:
      return { ...SAFE_FAILURE_DEFINITIONS.NOT_ADMIN, technicalDetails: technical };
    case 4:
      return { ...SAFE_FAILURE_DEFINITIONS.NOT_DEALER, technicalDetails: technical };
    case 6:
      return { ...SAFE_FAILURE_DEFINITIONS.NOT_MEMBER, technicalDetails: technical };
    case 7:
      return { ...SAFE_FAILURE_DEFINITIONS.OVER_CAP, technicalDetails: technical };
    case 8:
      return { ...SAFE_FAILURE_DEFINITIONS.PAUSED, technicalDetails: technical };
    case 9:
      return { ...SAFE_FAILURE_DEFINITIONS.WRONG_STATE, technicalDetails: technical };
    case 10:
      return { ...SAFE_FAILURE_DEFINITIONS.ZERO_AMOUNT, technicalDetails: technical };
    case 11:
      return { ...SAFE_FAILURE_DEFINITIONS.NOT_MATURED, technicalDetails: technical };
    case 12:
    case 13: // ZeroBalance often accompanies duplicate claim
      return { ...SAFE_FAILURE_DEFINITIONS.ALREADY_CLAIMED, technicalDetails: technical };
    case 18:
      return { ...SAFE_FAILURE_DEFINITIONS.EXCEEDS_ATTESTED_RESERVES, technicalDetails: technical };
    default:
      return {
        ...SAFE_FAILURE_DEFINITIONS.UNKNOWN_ERROR,
        technicalDetails: technical,
      };
  }
}
