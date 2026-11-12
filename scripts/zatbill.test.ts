import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStellarToml,
  extractFailureReason,
  testnetTransactionUrl,
  validateHomeDomain,
} from "./zatbill.js";

test("transaction links always use the Stellar Testnet Horizon endpoint", () => {
  assert.equal(
    testnetTransactionUrl("abc123"),
    "https://horizon-testnet.stellar.org/transactions/abc123",
  );
});

test("failure output reports Horizon transaction and operation result codes", () => {
  assert.equal(
    extractFailureReason({
      response: {
        status: 400,
        data: {
          extras: {
            result_codes: {
              transaction: "tx_failed",
              operations: ["op_not_authorized"],
            },
          },
        },
      },
    }),
    "tx_failed, op_not_authorized",
  );
});

test("Stellar home domain must be a public-host-style domain of at most 32 chars", () => {
  assert.equal(validateHomeDomain("assets.example.org"), "assets.example.org");
  assert.throws(() => validateHomeDomain(undefined), /STELLAR_HOME_DOMAIN/);
  assert.throws(
    () => validateHomeDomain("https://assets.example.org"),
    /STELLAR_HOME_DOMAIN/,
  );
  assert.throws(
    () => validateHomeDomain("a".repeat(33)),
    /STELLAR_HOME_DOMAIN/,
  );
});

test("stellar.toml describes ZATBILL as a non-backed Testnet demo token", () => {
  const toml = buildStellarToml(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "assets.example.org",
  );
  assert.match(toml, /NETWORK_PASSPHRASE="Test SDF Network ; September 2015"/);
  assert.match(toml, /code="ZATBILL"/);
  assert.match(toml, /name="MOCK ZATBILL"/);
  assert.match(toml, /status="test"/);
  assert.match(toml, /not a security, real T-bill, or backed asset/i);
  assert.match(
    toml,
    /https:\/\/assets\.example\.org\/assets\/zatbill-attestation\.json/,
  );
  assert.match(toml, /https:\/\/assets\.example\.org\/assets/);
  assert.doesNotMatch(toml, /attestation_of_reserve/);
  assert.match(
    toml,
    /No on-chain maturity schedule or fiat redemption is implemented/i,
  );
});
