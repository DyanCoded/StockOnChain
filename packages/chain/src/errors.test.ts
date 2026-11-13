import test from "node:test";
import assert from "node:assert/strict";
import {
  extractContractErrorCode,
  mapFailureToSafeError,
  SAFE_FAILURE_DEFINITIONS,
} from "./errors";

test("extractContractErrorCode extracts numeric codes from diverse error patterns", () => {
  assert.equal(extractContractErrorCode("HostError: Error(Contract, #6)"), 6);
  assert.equal(extractContractErrorCode("ContractError(7)"), 7);
  assert.equal(extractContractErrorCode("Transaction failed with error code: 11"), 11);
  assert.equal(extractContractErrorCode("Error::AlreadyClaimed occurred during invocation"), 12);
  assert.equal(extractContractErrorCode("Error::ExceedsAttestedReserves"), 18);
  assert.equal(extractContractErrorCode("Some unrelated host failure"), null);
});

test("mapFailureToSafeError maps UNVERIFIED_TRANSFER for unverified KYC trustlines", () => {
  const mapped = mapFailureToSafeError("op_not_authorized", { isUnverified: true });
  assert.equal(mapped.code, "UNVERIFIED_TRANSFER");
  assert.equal(mapped.title, SAFE_FAILURE_DEFINITIONS.UNVERIFIED_TRANSFER.title);
  assert.ok(mapped.userMessage.includes("cannot receive ZATBILL tokens"));
  assert.ok(mapped.remedy.includes("KYC"));
});

test("mapFailureToSafeError maps FROZEN_ACCOUNT when revoked/frozen compliance flag is detected", () => {
  const mapped = mapFailureToSafeError("op_not_authorized", { isFrozen: true });
  assert.equal(mapped.code, "FROZEN_ACCOUNT");
  assert.equal(mapped.title, SAFE_FAILURE_DEFINITIONS.FROZEN_ACCOUNT.title);
  assert.ok(mapped.userMessage.includes("temporarily blocked because compliance authorization"));
  assert.ok(mapped.remedy.includes("unfreeze"));
});

test("mapFailureToSafeError maps NOT_MEMBER for contract error 6", () => {
  const mapped = mapFailureToSafeError(new Error("HostError: Error(Contract, #6)"));
  assert.equal(mapped.code, "NOT_MEMBER");
  assert.equal(mapped.title, "Not an Enrolled Pot Member");
  assert.ok(mapped.userMessage.includes("not an approved member"));
  assert.ok(mapped.remedy.includes("administrator"));
});

test("mapFailureToSafeError maps OVER_CAP for contract error 7", () => {
  const mapped = mapFailureToSafeError("ContractError(7): Deposit exceeds cap");
  assert.equal(mapped.code, "OVER_CAP");
  assert.equal(mapped.title, "Contribution Cap Exceeded");
  assert.ok(mapped.userMessage.includes("exceeds the maximum per-member deposit cap"));
  assert.ok(mapped.remedy.includes("Reduce your contribution"));
});

test("mapFailureToSafeError maps NOT_MATURED for contract error 11", () => {
  const mapped = mapFailureToSafeError("Error(Contract, #11)");
  assert.equal(mapped.code, "NOT_MATURED");
  assert.equal(mapped.title, "Pot Has Not Reached Maturity");
  assert.ok(mapped.userMessage.includes("has not reached its maturity date"));
  assert.ok(mapped.remedy.includes("Wait until the maturity timestamp"));
});

test("mapFailureToSafeError maps ALREADY_CLAIMED for contract error 12 and 13", () => {
  const mapped = mapFailureToSafeError("Error::AlreadyClaimed");
  assert.equal(mapped.code, "ALREADY_CLAIMED");
  assert.equal(mapped.title, "Payout Already Claimed");
  assert.ok(mapped.userMessage.includes("already claimed your full pro-rata payout"));
  assert.ok(mapped.remedy.includes("No action required"));
});

test("mapFailureToSafeError maps WRONG_NETWORK for non-testnet passphrases or networks", () => {
  const mapped = mapFailureToSafeError(new Error("STELLAR_NETWORK must be explicitly set to testnet."));
  assert.equal(mapped.code, "WRONG_NETWORK");
  assert.equal(mapped.title, "Unsupported Stellar Network");
  assert.ok(mapped.userMessage.includes("strictly configured for the Stellar Testnet"));
  assert.ok(mapped.remedy.includes("Test SDF Network ; September 2015"));
});

test("mapFailureToSafeError maps EXCEEDS_ATTESTED_RESERVES for contract error 18", () => {
  const mapped = mapFailureToSafeError("Error(Contract, #18)");
  assert.equal(mapped.code, "EXCEEDS_ATTESTED_RESERVES");
  assert.equal(mapped.title, "Attested Reserve Limit Exceeded");
  assert.ok(mapped.userMessage.includes("exceeds the cryptographic reserve ceiling"));
});
