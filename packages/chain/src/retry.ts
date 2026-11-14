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

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 300,
  maxDelayMs: 3000,
  backoffFactor: 2,
};

/**
 * Executes an asynchronous function with exponential backoff retry logic.
 */
export async function withStellarRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries, initialDelayMs, maxDelayMs, backoffFactor } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error: unknown) {
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
