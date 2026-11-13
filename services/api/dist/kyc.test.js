"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = __importDefault(require("node:test"));
const kyc_js_1 = require("./kyc.js");
(0, node_test_1.default)("validateSouthAfricanId accepts valid synthetic South African IDs", () => {
    // Test generated synthetic IDs
    const id1 = (0, kyc_js_1.generateSyntheticSouthAfricanId)({
        year: 90,
        month: 1,
        day: 1,
        isMale: true,
        isCitizen: true,
    });
    const res1 = (0, kyc_js_1.validateSouthAfricanId)(id1);
    strict_1.default.equal(res1.valid, true);
    const id2 = (0, kyc_js_1.generateSyntheticSouthAfricanId)({
        year: 85,
        month: 12,
        day: 25,
        isMale: false,
        isCitizen: false,
    });
    const res2 = (0, kyc_js_1.validateSouthAfricanId)(id2);
    strict_1.default.equal(res2.valid, true);
    // Known verified synthetic ID: 9001015000085
    const resKnown = (0, kyc_js_1.validateSouthAfricanId)("9001015000085");
    strict_1.default.equal(resKnown.valid, true);
});
(0, node_test_1.default)("validateSouthAfricanId rejects invalid Luhn check digits", () => {
    // 9001015000085 has check digit 5. Changing to 4 should fail.
    const res = (0, kyc_js_1.validateSouthAfricanId)("9001015000084");
    strict_1.default.equal(res.valid, false);
    strict_1.default.match(res.reason ?? "", /checksum/i);
});
(0, node_test_1.default)("validateSouthAfricanId rejects invalid birthdate month or day", () => {
    // Invalid month 13
    const resMonth = (0, kyc_js_1.validateSouthAfricanId)("9013015000085");
    strict_1.default.equal(resMonth.valid, false);
    strict_1.default.match(resMonth.reason ?? "", /month/i);
    // Invalid day 32
    const resDay = (0, kyc_js_1.validateSouthAfricanId)("9001325000085");
    strict_1.default.equal(resDay.valid, false);
    strict_1.default.match(resDay.reason ?? "", /day/i);
});
(0, node_test_1.default)("validateSouthAfricanId rejects non-13-digit inputs", () => {
    strict_1.default.equal((0, kyc_js_1.validateSouthAfricanId)("900101500008").valid, false);
    strict_1.default.equal((0, kyc_js_1.validateSouthAfricanId)("90010150000855").valid, false);
    strict_1.default.equal((0, kyc_js_1.validateSouthAfricanId)("900101500008A").valid, false);
    strict_1.default.equal((0, kyc_js_1.validateSouthAfricanId)("").valid, false);
});
(0, node_test_1.default)("validateSouthAfricanId rejects invalid citizenship classifier", () => {
    // Citizenship digit at index 10 must be '0' or '1'
    const res = (0, kyc_js_1.validateSouthAfricanId)("9001015000285");
    strict_1.default.equal(res.valid, false);
    strict_1.default.match(res.reason ?? "", /citizenship/i);
});
(0, node_test_1.default)("generateSyntheticSouthAfricanId produces strictly synthetic compliant IDs", () => {
    for (let i = 0; i < 10; i++) {
        const syntheticId = (0, kyc_js_1.generateSyntheticSouthAfricanId)({
            year: 90 + i,
            month: (i % 12) + 1,
            day: (i % 28) + 1,
            isMale: i % 2 === 0,
            isCitizen: i % 3 === 0,
        });
        strict_1.default.equal(syntheticId.length, 13);
        const validation = (0, kyc_js_1.validateSouthAfricanId)(syntheticId);
        strict_1.default.equal(validation.valid, true, `Synthetic ID ${syntheticId} should be valid`);
    }
});
(0, node_test_1.default)("validatePhoneNumber validates South African domestic and international formats", () => {
    strict_1.default.equal((0, kyc_js_1.validatePhoneNumber)("0821234567"), true);
    strict_1.default.equal((0, kyc_js_1.validatePhoneNumber)("+27821234567"), true);
    strict_1.default.equal((0, kyc_js_1.validatePhoneNumber)("0719876543"), true);
    strict_1.default.equal((0, kyc_js_1.validatePhoneNumber)("+27719876543"), true);
    strict_1.default.equal((0, kyc_js_1.validatePhoneNumber)("12345"), false);
    strict_1.default.equal((0, kyc_js_1.validatePhoneNumber)("+12025550123"), false);
    strict_1.default.equal((0, kyc_js_1.validatePhoneNumber)("082123456"), false); // 9 digits
    strict_1.default.equal((0, kyc_js_1.validatePhoneNumber)("08212345678"), false); // 11 digits
});
(0, node_test_1.default)("validateOtp validates 6-digit numeric OTPs", () => {
    strict_1.default.equal((0, kyc_js_1.validateOtp)("123456"), true);
    strict_1.default.equal((0, kyc_js_1.validateOtp)("000000"), true);
    strict_1.default.equal((0, kyc_js_1.validateOtp)("999999"), true);
    strict_1.default.equal((0, kyc_js_1.validateOtp)("12345"), false);
    strict_1.default.equal((0, kyc_js_1.validateOtp)("1234567"), false);
    strict_1.default.equal((0, kyc_js_1.validateOtp)("12345a"), false);
    strict_1.default.equal((0, kyc_js_1.validateOtp)(""), false);
});
(0, node_test_1.default)("sanitizeLogPayload redacts ID numbers, phone numbers, OTPs, and secrets", () => {
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
    const sanitized = (0, kyc_js_1.sanitizeLogPayload)(sensitive);
    strict_1.default.equal(sanitized.account, "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH");
    strict_1.default.equal(sanitized.idNumber, "[REDACTED]");
    strict_1.default.equal(sanitized.phone, "[REDACTED]");
    strict_1.default.equal(sanitized.otp, "[REDACTED]");
    strict_1.default.equal(sanitized.consent, true);
    const nested = sanitized.nested;
    strict_1.default.equal(nested.secretKey, "[REDACTED]");
    strict_1.default.equal(nested.notes, "safe value");
    // Verify that JSON stringifying sanitized object contains zero PII strings
    const stringified = JSON.stringify(sanitized);
    strict_1.default.equal(stringified.includes("9001015000085"), false);
    strict_1.default.equal(stringified.includes("+27821234567"), false);
    strict_1.default.equal(stringified.includes("654321"), false);
    strict_1.default.equal(stringified.includes("SXXXXX"), false);
});
(0, node_test_1.default)("isValidStellarPublicKey validates public key format", () => {
    strict_1.default.equal((0, kyc_js_1.isValidStellarPublicKey)("GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH"), true);
    strict_1.default.equal((0, kyc_js_1.isValidStellarPublicKey)("invalid"), false);
    strict_1.default.equal((0, kyc_js_1.isValidStellarPublicKey)(""), false);
    strict_1.default.equal((0, kyc_js_1.isValidStellarPublicKey)("SAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH"), false);
});
(0, node_test_1.default)("KycStore maintains verified status and persists across instances without PII", () => {
    const tempDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), "kyc-store-test-"));
    const storePath = node_path_1.default.join(tempDir, "kyc-state.json");
    try {
        const store1 = new kyc_js_1.KycStore(storePath);
        const testAccount = "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH";
        strict_1.default.equal(store1.isVerified(testAccount), false);
        strict_1.default.equal(store1.get(testAccount), undefined);
        const now = Date.now();
        store1.set(testAccount, { verified: true, verifiedAt: now });
        strict_1.default.equal(store1.isVerified(testAccount), true);
        const record = store1.get(testAccount);
        strict_1.default.equal(record?.verified, true);
        strict_1.default.equal(record?.verifiedAt, now);
        // Verify stored JSON contains only account, verified, and timestamp
        const fileContent = node_fs_1.default.readFileSync(storePath, "utf8");
        const parsed = JSON.parse(fileContent);
        strict_1.default.ok(parsed[testAccount]);
        strict_1.default.equal(fileContent.includes("idNumber"), false);
        strict_1.default.equal(fileContent.includes("phone"), false);
        // Instantiate fresh store instance from same file
        const store2 = new kyc_js_1.KycStore(storePath);
        strict_1.default.equal(store2.isVerified(testAccount), true);
        strict_1.default.equal(store2.get(testAccount)?.verifiedAt, now);
        // Revocation
        const revokedNow = now + 1000;
        store2.set(testAccount, {
            verified: false,
            verifiedAt: now,
            revokedAt: revokedNow,
        });
        strict_1.default.equal(store2.isVerified(testAccount), false);
        strict_1.default.equal(store2.get(testAccount)?.revokedAt, revokedNow);
    }
    finally {
        node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    }
});
