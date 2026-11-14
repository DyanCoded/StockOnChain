"use strict";
/**
 * @stockonchain/chain - Stellar RPC & Horizon Resilience Client (Q-02)
 *
 * Implements exponential backoff and jittered retry logic for Stellar RPC
 * and Horizon requests to ensure platform resilience against network flakiness.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withStellarRetry = withStellarRetry;
const DEFAULT_RETRY_OPTIONS = {
    maxRetries: 3,
    initialDelayMs: 300,
    maxDelayMs: 3000,
    backoffFactor: 2,
};
/**
 * Executes an asynchronous function with exponential backoff retry logic.
 */
async function withStellarRetry(operation, options = {}) {
    const { maxRetries, initialDelayMs, maxDelayMs, backoffFactor } = {
        ...DEFAULT_RETRY_OPTIONS,
        ...options,
    };
    let attempt = 0;
    let delay = initialDelayMs;
    while (true) {
        try {
            return await operation();
        }
        catch (error) {
            attempt += 1;
            if (attempt > maxRetries) {
                throw error;
            }
            // Add jitter
            const jitter = Math.random() * 100;
            const sleepMs = Math.min(delay + jitter, maxDelayMs);
            await new Promise((resolve) => setTimeout(resolve, sleepMs));
            delay *= backoffFactor;
        }
    }
}
