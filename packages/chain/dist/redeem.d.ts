/**
 * @stockonchain/chain - Pot Redeem & Claim Service Layer (A-05)
 *
 * Implements:
 * 1. Maturity detection and member claim eligibility calculation (principal, yield, total).
 * 2. Plain-language early claim restrictions (reverting attempts before maturity).
 * 3. Pro-rata share claim execution on Stellar Testnet.
 * 4. Seamless handoff to SEP-24 simulated off-ramp payout rails.
 *
 * AI Guardrails:
 * - G5 Testnet only: Asserts Stellar Testnet passphrase and mock assets.
 * - G6 Honesty: Clearly labels maturity states, simulated yields, and mock off-ramps.
 * - G9 Frontend guardrails: Localized Rand formatting.
 */
import { type PotSafeError } from "./errors";
export interface ClaimBreakdown {
    userAddress: string;
    isMatured: boolean;
    hasClaimed: boolean;
    potLifecycleState: "Open" | "Invested" | "Matured" | "Settled";
    timeRemainingSeconds: number;
    principalContributedMzar: number;
    principalFormatted: string;
    accumulatedYieldMzar: number;
    accumulatedYieldFormatted: string;
    totalPayoutMzar: number;
    totalPayoutFormatted: string;
    sharePercent: number;
    maturityDateFormatted: string;
}
export interface ClaimReceipt {
    txHash: string;
    timestamp: string;
    claimedMzar: number;
    claimedFormatted: string;
    payoutStatus: "claimed_to_wallet";
    explorerUrl: string;
}
export interface ClaimExecutionResult {
    success: boolean;
    receipt?: ClaimReceipt;
    error?: PotSafeError;
}
export interface ClaimBreakdownParams {
    userAddress?: string;
    potState?: "Open" | "Invested" | "Matured" | "Settled";
    potLifecycleState?: "Open" | "Invested" | "Matured" | "Settled";
    isMatured?: boolean;
    timeRemainingSeconds?: number;
    principalContributed?: number;
    principalContributedMzar?: number;
    annualizedRate?: number;
    termDays?: number;
    hasClaimed?: boolean;
    sharePercent?: number;
}
export declare function getClaimBreakdown(params?: ClaimBreakdownParams): ClaimBreakdown;
/**
 * Executes member claim of principal + yield from settled pot.
 */
export declare function executeMemberClaim(params: {
    breakdown: ClaimBreakdown;
    potContractId?: string;
}): Promise<ClaimExecutionResult>;
