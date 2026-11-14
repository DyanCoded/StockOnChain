/**
 * @stockonchain/chain - Stellar RPC & Horizon Resilience Client (Q-02)
 *
 * Implements exponential backoff and jittered retry logic for Stellar RPC
 * and Horizon requests to ensure platform resilience against network flakiness.
 */
export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
}
/**
 * Executes an asynchronous function with exponential backoff retry logic.
 */
export declare function withStellarRetry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>;
