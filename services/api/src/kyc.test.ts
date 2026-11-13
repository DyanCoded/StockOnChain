import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  generateSyntheticSouthAfricanId,
  isValidStellarPublicKey,
  KycStore,
  sanitizeLogPayload,
  validateOtp,
  validatePhoneNumber,
  validateSouthAfricanId,
} from "./kyc.js";

test("validateSouthAfricanId accepts valid synthetic South African IDs", () => {
  // Test generated synthetic IDs
  const id1 = generateSyntheticSouthAfricanId({
    year: 90,
    month: 1,
    day: 1,
    isMale: true,
    isCitizen: true,
  });
  const res1 = validateSouthAfricanId(id1);
  assert.equal(res1.valid, true);

  const id2 = generateSyntheticSouthAfricanId({
    year: 85,
    month: 12,
    day: 25,
    isMale: false,
    isCitizen: false,
  });
  const res2 = validateSouthAfricanId(id2);
  assert.equal(res2.valid, true);

  // Known verified synthetic ID: 9001015000085
  const resKnown = validateSouthAfricanId("9001015000085");
  assert.equal(resKnown.valid, true);
});

test("validateSouthAfricanId rejects invalid Luhn check digits", () => {
  // 9001015000085 has check digit 5. Changing to 4 should fail.
  const res = validateSouthAfricanId("9001015000084");
  assert.equal(res.valid, false);
  assert.match(res.reason ?? "", /checksum/i);
});

test("validateSouthAfricanId rejects invalid birthdate month or day", () => {
  // Invalid month 13
  const resMonth = validateSouthAfricanId("9013015000085");
  assert.equal(resMonth.valid, false);
  assert.match(resMonth.reason ?? "", /month/i);

  // Invalid day 32
  const resDay = validateSouthAfricanId("9001325000085");
  assert.equal(resDay.valid, false);
  assert.match(resDay.reason ?? "", /day/i);
});

test("validateSouthAfricanId rejects non-13-digit inputs", () => {
  assert.equal(validateSouthAfricanId("900101500008").valid, false);
  assert.equal(validateSouthAfricanId("90010150000855").valid, false);
  assert.equal(validateSouthAfricanId("900101500008A").valid, false);
  assert.equal(validateSouthAfricanId("").valid, false);
});

test("validateSouthAfricanId rejects invalid citizenship classifier", () => {
  // Citizenship digit at index 10 must be '0' or '1'
  const res = validateSouthAfricanId("9001015000285");
  assert.equal(res.valid, false);
  assert.match(res.reason ?? "", /citizenship/i);
});

test("generateSyntheticSouthAfricanId produces strictly synthetic compliant IDs", () => {
  for (let i = 0; i < 10; i++) {
    const syntheticId = generateSyntheticSouthAfricanId({
      year: 90 + i,
      month: (i % 12) + 1,
      day: (i % 28) + 1,
      isMale: i % 2 === 0,
      isCitizen: i % 3 === 0,
    });
    assert.equal(syntheticId.length, 13);
    const validation = validateSouthAfricanId(syntheticId);
    assert.equal(
      validation.valid,
      true,
      `Synthetic ID ${syntheticId} should be valid`,
    );
  }
});

test("validatePhoneNumber validates South African domestic and international formats", () => {
  assert.equal(validatePhoneNumber("0821234567"), true);
  assert.equal(validatePhoneNumber("+27821234567"), true);
  assert.equal(validatePhoneNumber("0719876543"), true);
  assert.equal(validatePhoneNumber("+27719876543"), true);

  assert.equal(validatePhoneNumber("12345"), false);
  assert.equal(validatePhoneNumber("+12025550123"), false);
  assert.equal(validatePhoneNumber("082123456"), false); // 9 digits
  assert.equal(validatePhoneNumber("08212345678"), false); // 11 digits
});

test("validateOtp validates 6-digit numeric OTPs", () => {
  assert.equal(validateOtp("123456"), true);
  assert.equal(validateOtp("000000"), true);
  assert.equal(validateOtp("999999"), true);

  assert.equal(validateOtp("12345"), false);
  assert.equal(validateOtp("1234567"), false);
  assert.equal(validateOtp("12345a"), false);
  assert.equal(validateOtp(""), false);
});

test("sanitizeLogPayload redacts ID numbers, phone numbers, OTPs, and secrets", () => {
  const sensitive = {
    account: "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH",
    idNumber: "9001015000085",
    phone: "+27821234567",
    otp: "654321",
    consent: true,
    nested: {
      secretKey: "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      notes: "safe value",
    },
  };

  const sanitized = sanitizeLogPayload(sensitive) as Record<string, unknown>;

  assert.equal(
    sanitized.account,
    "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH",
  );
  assert.equal(sanitized.idNumber, "[REDACTED]");
  assert.equal(sanitized.phone, "[REDACTED]");
  assert.equal(sanitized.otp, "[REDACTED]");
  assert.equal(sanitized.consent, true);

  const nested = sanitized.nested as Record<string, unknown>;
  assert.equal(nested.secretKey, "[REDACTED]");
  assert.equal(nested.notes, "safe value");

  // Verify that JSON stringifying sanitized object contains zero PII strings
  const stringified = JSON.stringify(sanitized);
  assert.equal(stringified.includes("9001015000085"), false);
  assert.equal(stringified.includes("+27821234567"), false);
  assert.equal(stringified.includes("654321"), false);
  assert.equal(stringified.includes("SXXXXX"), false);
});

test("isValidStellarPublicKey validates public key format", () => {
  assert.equal(
    isValidStellarPublicKey(
      "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH",
    ),
    true,
  );
  assert.equal(isValidStellarPublicKey("invalid"), false);
  assert.equal(isValidStellarPublicKey(""), false);
  assert.equal(
    isValidStellarPublicKey(
      "SAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH",
    ),
    false,
  );
});

test("KycStore maintains verified status and persists across instances without PII", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kyc-store-test-"));
  const storePath = path.join(tempDir, "kyc-state.json");

  try {
    const store1 = new KycStore(storePath);
    const testAccount =
      "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH";

    assert.equal(store1.isVerified(testAccount), false);
    assert.equal(store1.get(testAccount), undefined);

    const now = Date.now();
    store1.set(testAccount, { verified: true, verifiedAt: now });

    assert.equal(store1.isVerified(testAccount), true);
    const record = store1.get(testAccount);
    assert.equal(record?.verified, true);
    assert.equal(record?.verifiedAt, now);

    // Verify stored JSON contains only account, verified, and timestamp
    const fileContent = fs.readFileSync(storePath, "utf8");
    const parsed = JSON.parse(fileContent) as Record<string, unknown>;
    assert.ok(parsed[testAccount]);
    assert.equal(fileContent.includes("idNumber"), false);
    assert.equal(fileContent.includes("phone"), false);

    // Instantiate fresh store instance from same file
    const store2 = new KycStore(storePath);
    assert.equal(store2.isVerified(testAccount), true);
    assert.equal(store2.get(testAccount)?.verifiedAt, now);

    // Revocation
    const revokedNow = now + 1000;
    store2.set(testAccount, {
      verified: false,
      verifiedAt: now,
      revokedAt: revokedNow,
    });
    assert.equal(store2.isVerified(testAccount), false);
    assert.equal(store2.get(testAccount)?.revokedAt, revokedNow);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
