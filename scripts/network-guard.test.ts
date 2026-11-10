import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertTestnetConfiguration,
  TESTNET_PASSPHRASE,
} from '../packages/chain/src/index.js';

test('accepts only the exact Stellar Testnet configuration', () => {
  assert.doesNotThrow(() =>
    assertTestnetConfiguration({
      STELLAR_NETWORK: 'testnet',
      STELLAR_NETWORK_PASSPHRASE: TESTNET_PASSPHRASE,
    }),
  );
});

test('rejects a missing network setting', () => {
  assert.throws(
    () => assertTestnetConfiguration({ STELLAR_NETWORK_PASSPHRASE: TESTNET_PASSPHRASE }),
    /STELLAR_NETWORK must be explicitly set to testnet/,
  );
});

test('rejects non-testnet networks', () => {
  assert.throws(
    () =>
      assertTestnetConfiguration({
        STELLAR_NETWORK: 'mainnet',
        STELLAR_NETWORK_PASSPHRASE: TESTNET_PASSPHRASE,
      }),
    /STELLAR_NETWORK must be explicitly set to testnet/,
  );
});

test('rejects a passphrase that does not match testnet', () => {
  assert.throws(
    () =>
      assertTestnetConfiguration({
        STELLAR_NETWORK: 'testnet',
        STELLAR_NETWORK_PASSPHRASE: 'wrong passphrase',
      }),
    /does not match Stellar Testnet/,
  );
});
