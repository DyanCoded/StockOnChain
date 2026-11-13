import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTestnetConfiguration,
  TESTNET_PASSPHRASE,
} from "../packages/chain/src/index.js";

test("mZAR setup requires the exact Stellar Testnet configuration", () => {
  assert.doesNotThrow(() =>
    assertTestnetConfiguration({
      STELLAR_NETWORK: "testnet",
      STELLAR_NETWORK_PASSPHRASE: TESTNET_PASSPHRASE,
    }),
  );
  assert.throws(
    () =>
      assertTestnetConfiguration({
        STELLAR_NETWORK: "mainnet",
        STELLAR_NETWORK_PASSPHRASE:
          "Public Global Stellar Network ; September 2015",
      }),
    /STELLAR_NETWORK must be explicitly set to testnet/,
  );
});
