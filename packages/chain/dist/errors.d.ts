/**
 * @stockonchain/chain - Safe Failure State Mappings (T-08)
 *
 * Maps Soroban contract revert codes, Horizon transaction errors,
 * and network guardrail failures to user-friendly plain-language messages
 * designed for UI consumption in task A-07.
 */
export type PotFailureReasonCode = "UNVERIFIED_TRANSFER" | "FROZEN_ACCOUNT" | "NOT_MEMBER" | "OVER_CAP" | "NOT_MATURED" | "ALREADY_CLAIMED" | "WRONG_NETWORK" | "EXCEEDS_ATTESTED_RESERVES" | "PAUSED" | "ZERO_AMOUNT" | "WRONG_STATE" | "NOT_ADMIN" | "NOT_DEALER" | "UNKNOWN_ERROR";
export interface PotSafeError {
    code: PotFailureReasonCode;
    title: string;
    userMessage: string;
    technicalDetails?: string;
    remedy: string;
}
export declare const SAFE_FAILURE_DEFINITIONS: Record<PotFailureReasonCode, Omit<PotSafeError, "technicalDetails">>;
/**
 * Extracts numeric Soroban ContractError code from error objects, strings, or CLI outputs.
 */
export declare function extractContractErrorCode(error: unknown): number | null;
/**
 * Maps any error (Soroban revert, Horizon rejection, Network guardrail) to a PotSafeError.
 */
export declare function mapFailureToSafeError(error: unknown, context?: {
    isFrozen?: boolean;
    isUnverified?: boolean;
    technicalDetails?: string;
}): PotSafeError;
