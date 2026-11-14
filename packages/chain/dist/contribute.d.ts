/**
 * @stockonchain/chain - Contribution & Top-Up Service Layer (A-04)
 *
 * Implements:
 * 1. Verification status checks (A-01 gatekeeper)
 * 2. Balance checks & frictionless instant faucet top-up flow
 * 3. One-tap contribution execution with per-member cap validation & open window checks
 * 4. Transparent transaction states (pending, confirmed, failed) with block explorer receipts
 * 5. Error mapping using SAFE_FAILURE_DEFINITIONS (no raw error codes in UI)
 *
 * AI Guardrails:
 * - G1 No secrets: Only synthetic / user public keys.
 * - G5 Testnet only: Asserts testnet network passphrase and endpoints.
 * - G6 Honesty: Discloses mock assets, testnet status, and simulated execution.
 * - G9 Frontend guardrails: Localized South African Rand (en-ZA ZAR) formatting.
 */
import { type PotSafeError } from "./errors";
export interface ContributeState {
    userAddress: string;
    isVerified: boolean;
    walletBalanceMzar: number;
    walletBalanceFormatted: string;
    memberContributionMzar: number;
    memberCapMzar: number;
    remainingCapMzar: number;
    potLifecycleState: "Open" | "Invested" | "Matured" | "Settled";
    isWindowOpen: boolean;
    potTargetMzar: number;
    currentPotTotalMzar: number;
}
export interface ContributionReceipt {
    txHash: string;
    timestamp: string;
    amountMzar: number;
    amountFormatted: string;
    previousSharePercent: number;
    newSharePercent: number;
    newMemberTotalMzar: number;
    newMemberTotalFormatted: string;
    explorerUrl: string;
    status: "confirmed";
}
export interface ContributionResult {
    success: boolean;
    receipt?: ContributionReceipt;
    error?: PotSafeError;
}
export declare const DEFAULT_SYNTHETIC_USER_ADDRESS = "GDYQW3VZ3N5N5M2K6DTHW5U2B3J6OQZ7K4Z5X9M8W7Q6P5L4K3J2I1H";
/**
 * Returns the active contribution state for a given user and pot.
 */
export declare function getContributeState(params?: {
    userAddress?: string;
    isVerified?: boolean;
    walletBalance?: number;
    contributedSoFar?: number;
    memberCap?: number;
    potState?: "Open" | "Invested" | "Matured" | "Settled";
    potTarget?: number;
    currentPotTotal?: number;
}): ContributeState;
/**
 * Simulates a frictionless Testnet mZAR faucet top-up.
 */
export declare function executeTopUp(userAddress: string, amountMzar?: number): Promise<{
    success: boolean;
    newBalanceMzar: number;
    txHash: string;
}>;
/**
 * Validates and executes a one-tap contribution against pot rules.
 */
export declare function executeContribution(params: {
    amountMzar: number;
    state: ContributeState;
    potContractId?: string;
}): Promise<ContributionResult>;
