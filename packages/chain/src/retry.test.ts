import assert from 'node:assert/strict';
import test from 'node:test';
import { withStellarRetry } from './retry';

test('withStellarRetry succeeds immediately on successful operation', async () => {
  let calls = 0;
  const result = await withStellarRetry(async () => {
    calls += 1;
    return 'ok';
  });

  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('withStellarRetry retries on failure and recovers upon success', async () => {
  let calls = 0;
  const result = await withStellarRetry(
    async () => {
      calls += 1;
      if (calls < 3) {
        throw new Error('Temporary Horizon 504 gateway timeout');
      }
      return 'recovered';
    },
    { initialDelayMs: 20, maxRetries: 3 },
  );

  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
});

test('withStellarRetry throws after exceeding max retries', async () => {
  let calls = 0;
  await assert.rejects(
    async () => {
      await withStellarRetry(
        async () => {
          calls += 1;
          throw new Error('Persistent network failure');
        },
        { initialDelayMs: 10, maxRetries: 2 },
      );
    },
    { message: 'Persistent network failure' },
  );

  assert.equal(calls, 3); // initial + 2 retries
});
