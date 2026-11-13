"use strict";
/**
 * @stockonchain/api - KYC & Compliance Allowlist Module
 *
 * Simulates South African identity verification (format and Luhn check),
 * phone OTP, and user consent under POPIA guidelines.
 *
 * Zero personal data (names, IDs, phone numbers) is written to logs or storage.
 * Storage retains only a boolean `verified` flag, account public key, and timestamps.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycService = exports.KycStore = void 0;
exports.validateSouthAfricanId = validateSouthAfricanId;
exports.generateSyntheticSouthAfricanId = generateSyntheticSouthAfricanId;
exports.validatePhoneNumber = validatePhoneNumber;
exports.validateOtp = validateOtp;
exports.sanitizeLogPayload = sanitizeLogPayload;
exports.isValidStellarPublicKey = isValidStellarPublicKey;
exports.extractHorizonReason = extractHorizonReason;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const stellar_sdk_1 = require("@stellar/stellar-sdk");
/**
 * Validates a South African 13-digit National ID number format and Luhn checksum.
 * Standard format: YYMMDD SSSS C A Z
 * - YYMMDD: Date of birth
 * - SSSS: Sequence number (0000-4999 female, 5000-9999 male)
 * - C: Citizenship (0 = SA citizen, 1 = permanent resident)
 * - A: Historical classifier (typically 8)
 * - Z: Checksum digit calculated via Luhn algorithm (mod 10)
 */
function validateSouthAfricanId(id) {
    if (typeof id !== "string" || !/^\d{13}$/.test(id)) {
        return {
            valid: false,
            reason: "ID number must be exactly 13 digits.",
        };
    }
    const month = parseInt(id.substring(2, 4), 10);
    const day = parseInt(id.substring(4, 6), 10);
    if (month < 1 || month > 12) {
        return {
            valid: false,
            reason: "Invalid birthdate month in ID number.",
        };
    }
    if (day < 1 || day > 31) {
        return {
            valid: false,
            reason: "Invalid birthdate day in ID number.",
        };
    }
    const citizenship = id.charAt(10);
    if (citizenship !== "0" && citizenship !== "1") {
        return {
            valid: false,
            reason: "Invalid citizenship code in ID number (must be 0 or 1).",
        };
    }
    // Calculate checksum using the Department of Home Affairs Luhn algorithm:
    // 1. Sum digits at odd positions (1st, 3rd, 5th, 7th, 9th, 11th - 0-indexed: 0, 2, 4, 6, 8, 10).
    let sumOdd = 0;
    for (let i = 0; i < 11; i += 2) {
        sumOdd += parseInt(id.charAt(i), 10);
    }
    // 2. Concatenate digits at even positions (2nd, 4th, 6th, 8th, 10th, 12th - 0-indexed: 1, 3, 5, 7, 9, 11).
    let evenStr = "";
    for (let i = 1; i < 12; i += 2) {
        evenStr += id.charAt(i);
    }
    // 3. Multiply concatenated number by 2 and sum its digits.
    const evenMultiplied = parseInt(evenStr, 10) * 2;
    let sumEvenDigits = 0;
    for (const char of String(evenMultiplied)) {
        sumEvenDigits += parseInt(char, 10);
    }
    // 4. Check digit is (10 - ((sumOdd + sumEvenDigits) % 10)) % 10.
    const total = sumOdd + sumEvenDigits;
    const expectedCheckDigit = (10 - (total % 10)) % 10;
    const actualCheckDigit = parseInt(id.charAt(12), 10);
    if (expectedCheckDigit !== actualCheckDigit) {
        return {
            valid: false,
            reason: "Invalid ID number checksum (Luhn check failed).",
        };
    }
    return { valid: true };
}
/**
 * Generates a valid synthetic South African ID number for testing and simulation.
 * Never use real personal identification numbers.
 */
function generateSyntheticSouthAfricanId(options) {
    const yy = String(options?.year ?? 95).padStart(2, "0").slice(-2);
    const mm = String(options?.month ?? 6).padStart(2, "0");
    const dd = String(options?.day ?? 15).padStart(2, "0");
    const ssss = options?.isMale !== false ? "5000" : "0500";
    const c = options?.isCitizen !== false ? "0" : "1";
    const a = "8";
    const first12 = `${yy}${mm}${dd}${ssss}${c}${a}`;
    let sumOdd = 0;
    for (let i = 0; i < 11; i += 2) {
        sumOdd += parseInt(first12.charAt(i), 10);
    }
    let evenStr = "";
    for (let i = 1; i < 12; i += 2) {
        evenStr += first12.charAt(i);
    }
    const evenMultiplied = parseInt(evenStr, 10) * 2;
    let sumEvenDigits = 0;
    for (const char of String(evenMultiplied)) {
        sumEvenDigits += parseInt(char, 10);
    }
    const total = sumOdd + sumEvenDigits;
    const checkDigit = (10 - (total % 10)) % 10;
    return `${first12}${checkDigit}`;
}
/**
 * Validates a South African phone number format.
 * Accepts formats: 0XXXXXXXXX (10 digits) or +27XXXXXXXXX (12 characters).
 */
function validatePhoneNumber(phone) {
    if (typeof phone !== "string") {
        return false;
    }
    const clean = phone.trim();
    return /^(?:\+27|0)\d{9}$/.test(clean);
}
/**
 * Validates a simulated 6-digit one-time PIN (OTP).
 */
function validateOtp(otp) {
    if (typeof otp !== "string") {
        return false;
    }
    return /^\d{6}$/.test(otp.trim());
}
/**
 * Deep sanitization for logging to guarantee zero personal data or secret leakage (G1 & G7).
 */
function sanitizeLogPayload(input) {
    if (typeof input !== "object" || input === null) {
        return input;
    }
    if (Array.isArray(input)) {
        return input.map(sanitizeLogPayload);
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
        if (/idnumber|id_number|phone|cell|mobile|otp|secret|private|seed/i.test(key)) {
            sanitized[key] = "[REDACTED]";
        }
        else if (typeof value === "object" && value !== null) {
            sanitized[key] = sanitizeLogPayload(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
function isValidStellarPublicKey(value) {
    if (typeof value !== "string" || !value.startsWith("G") || value.length !== 56) {
        return false;
    }
    try {
        stellar_sdk_1.Keypair.fromPublicKey(value);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * KYC Verification Store.
 * Retains only: account public key, boolean verified flag, and timestamps.
 * Absolutely no PII (names, phone numbers, ID numbers) is stored.
 */
class KycStore {
    filePath;
    memoryRecords = new Map();
    constructor(filePath) {
        this.filePath = filePath;
        this.load();
    }
    load() {
        if (!this.filePath || !(0, node_fs_1.existsSync)(this.filePath)) {
            return;
        }
        try {
            const data = JSON.parse((0, node_fs_1.readFileSync)(this.filePath, "utf8"));
            for (const [account, record] of Object.entries(data)) {
                this.memoryRecords.set(account, {
                    account,
                    verified: Boolean(record.verified),
                    verifiedAt: Number(record.verifiedAt) || 0,
                    revokedAt: record.revokedAt ? Number(record.revokedAt) : undefined,
                });
            }
        }
        catch {
            // Ignore parse failure; keep clean memory state
        }
    }
    persist() {
        if (!this.filePath) {
            return;
        }
        const dir = node_path_1.default.dirname(this.filePath);
        if (!(0, node_fs_1.existsSync)(dir)) {
            (0, node_fs_1.mkdirSync)(dir, { recursive: true });
        }
        const serialized = {};
        this.memoryRecords.forEach((record, account) => {
            serialized[account] = {
                verified: record.verified,
                verifiedAt: record.verifiedAt,
                ...(record.revokedAt ? { revokedAt: record.revokedAt } : {}),
            };
        });
        (0, node_fs_1.writeFileSync)(this.filePath, JSON.stringify(serialized, null, 2), "utf8");
    }
    get(account) {
        return this.memoryRecords.get(account);
    }
    isVerified(account) {
        const record = this.memoryRecords.get(account);
        return Boolean(record?.verified);
    }
    set(account, record) {
        this.memoryRecords.set(account, {
            account,
            ...record,
        });
        this.persist();
    }
    clear() {
        this.memoryRecords.clear();
        this.persist();
    }
}
exports.KycStore = KycStore;
function extractHorizonReason(error) {
    if (typeof error !== "object" || error === null) {
        return "Unknown transaction error.";
    }
    const resp = error;
    const codes = resp.response?.data?.extras?.result_codes;
    const details = [codes?.transaction, ...(codes?.operations ?? [])].filter((code) => Boolean(code));
    if (details.length > 0) {
        return details.join(", ");
    }
    const status = resp.response?.status;
    return status
        ? `Horizon rejected transaction (HTTP ${status})`
        : error.message || "Transaction rejected";
}
class KycService {
    issuer;
    sponsor;
    dealer;
    horizon;
    zatbillAsset;
    kycStore;
    queue = Promise.resolve();
    constructor(config) {
        this.issuer = config.issuerKeypair;
        this.sponsor = config.sponsorKeypair;
        this.dealer = config.dealerKeypair;
        this.horizon = config.horizon;
        this.zatbillAsset = config.zatbillAsset;
        this.kycStore = config.kycStore;
    }
    enqueue(task) {
        const res = this.queue.then(task);
        this.queue = res.then(() => undefined, () => undefined);
        return res;
    }
    async verify(request) {
        if (!request.consent) {
            throw new Error("Explicit POPIA user consent is required.");
        }
        if (!isValidStellarPublicKey(request.account)) {
            throw new Error("account must be a valid Stellar account public key.");
        }
        const idValidation = validateSouthAfricanId(request.idNumber);
        if (!idValidation.valid) {
            throw new Error(idValidation.reason || "Invalid South African ID number.");
        }
        if (!validatePhoneNumber(request.phone)) {
            throw new Error("Invalid South African phone number format.");
        }
        if (!validateOtp(request.otp)) {
            throw new Error("Invalid 6-digit verification code (OTP).");
        }
        return this.enqueue(async () => {
            let createdAccount = false;
            let provisionedTrustline = false;
            let accountLoaded = null;
            try {
                accountLoaded = await this.horizon.loadAccount(request.account);
            }
            catch (err) {
                const status = err?.response?.status;
                if (status === 404) {
                    // Sponsor provisions the account on Testnet with 2.5 XLM reserve
                    const sponsorAcc = await this.horizon.loadAccount(this.sponsor.publicKey());
                    const tx = new stellar_sdk_1.TransactionBuilder(sponsorAcc, {
                        fee: stellar_sdk_1.BASE_FEE,
                        networkPassphrase: stellar_sdk_1.Networks.TESTNET,
                    })
                        .addOperation(stellar_sdk_1.Operation.createAccount({
                        destination: request.account,
                        startingBalance: "2.5",
                    }))
                        .setTimeout(60)
                        .build();
                    tx.sign(this.sponsor);
                    await this.horizon.submitTransaction(tx);
                    createdAccount = true;
                    accountLoaded = await this.horizon.loadAccount(request.account);
                }
                else {
                    throw err;
                }
            }
            let hasTrustline = accountLoaded.balances.some((b) => "asset_code" in b &&
                b.asset_code === this.zatbillAsset.code &&
                b.asset_issuer === this.zatbillAsset.issuer);
            if (!hasTrustline) {
                if (request.signedTrustlineXdr) {
                    const clientTx = stellar_sdk_1.TransactionBuilder.fromXDR(request.signedTrustlineXdr, stellar_sdk_1.Networks.TESTNET);
                    await this.horizon.submitTransaction(clientTx);
                    provisionedTrustline = true;
                    accountLoaded = await this.horizon.loadAccount(request.account);
                    hasTrustline = true;
                }
                else if (request.testSecret) {
                    const testKey = stellar_sdk_1.Keypair.fromSecret(request.testSecret);
                    if (testKey.publicKey() !== request.account) {
                        throw new Error("testSecret does not match the account public key.");
                    }
                    const testAcc = await this.horizon.loadAccount(request.account);
                    const tx = new stellar_sdk_1.TransactionBuilder(testAcc, {
                        fee: stellar_sdk_1.BASE_FEE,
                        networkPassphrase: stellar_sdk_1.Networks.TESTNET,
                    })
                        .addOperation(stellar_sdk_1.Operation.changeTrust({
                        asset: this.zatbillAsset,
                        limit: "1000000",
                    }))
                        .setTimeout(60)
                        .build();
                    tx.sign(testKey);
                    await this.horizon.submitTransaction(tx);
                    provisionedTrustline = true;
                    accountLoaded = await this.horizon.loadAccount(request.account);
                    hasTrustline = true;
                }
            }
            let authTxHash;
            if (hasTrustline) {
                const zatbillLine = accountLoaded.balances.find((b) => "asset_code" in b &&
                    b.asset_code === this.zatbillAsset.code &&
                    b.asset_issuer === this.zatbillAsset.issuer);
                if (!zatbillLine?.is_authorized) {
                    const issuerAcc = await this.horizon.loadAccount(this.issuer.publicKey());
                    const tx = new stellar_sdk_1.TransactionBuilder(issuerAcc, {
                        fee: stellar_sdk_1.BASE_FEE,
                        networkPassphrase: stellar_sdk_1.Networks.TESTNET,
                    })
                        .addOperation(stellar_sdk_1.Operation.setTrustLineFlags({
                        trustor: request.account,
                        asset: this.zatbillAsset,
                        flags: { authorized: true },
                    }))
                        .setTimeout(60)
                        .build();
                    tx.sign(this.issuer);
                    const res = await this.horizon.submitTransaction(tx);
                    authTxHash = res.hash;
                }
            }
            this.kycStore.set(request.account, {
                verified: true,
                verifiedAt: Date.now(),
            });
            return {
                verified: true,
                authorized: Boolean(hasTrustline),
                account: request.account,
                createdAccount,
                provisionedTrustline,
                transactionHash: authTxHash,
            };
        });
    }
    async revoke(account) {
        if (!isValidStellarPublicKey(account)) {
            throw new Error("account must be a valid Stellar account public key.");
        }
        return this.enqueue(async () => {
            let authTxHash;
            try {
                const targetAcc = await this.horizon.loadAccount(account);
                const hasTrustline = targetAcc.balances.some((b) => "asset_code" in b &&
                    b.asset_code === this.zatbillAsset.code &&
                    b.asset_issuer === this.zatbillAsset.issuer);
                if (hasTrustline) {
                    const issuerAcc = await this.horizon.loadAccount(this.issuer.publicKey());
                    const tx = new stellar_sdk_1.TransactionBuilder(issuerAcc, {
                        fee: stellar_sdk_1.BASE_FEE,
                        networkPassphrase: stellar_sdk_1.Networks.TESTNET,
                    })
                        .addOperation(stellar_sdk_1.Operation.setTrustLineFlags({
                        trustor: account,
                        asset: this.zatbillAsset,
                        flags: { authorized: false },
                    }))
                        .setTimeout(60)
                        .build();
                    tx.sign(this.issuer);
                    const res = await this.horizon.submitTransaction(tx);
                    authTxHash = res.hash;
                }
            }
            catch (err) {
                const status = err?.response?.status;
                if (status !== 404) {
                    throw err;
                }
            }
            const existing = this.kycStore.get(account);
            this.kycStore.set(account, {
                verified: false,
                verifiedAt: existing?.verifiedAt ?? 0,
                revokedAt: Date.now(),
            });
            return {
                verified: false,
                authorized: false,
                account,
                transactionHash: authTxHash,
            };
        });
    }
    async getStatus(account) {
        if (!isValidStellarPublicKey(account)) {
            throw new Error("account must be a valid Stellar account public key.");
        }
        const kycRecord = this.kycStore.get(account);
        const onchain = {
            accountExists: false,
            hasTrustline: false,
            isAuthorized: false,
            isClawbackEnabled: false,
            balance: "0",
        };
        try {
            const targetAcc = await this.horizon.loadAccount(account);
            onchain.accountExists = true;
            const line = targetAcc.balances.find((b) => "asset_code" in b &&
                b.asset_code === this.zatbillAsset.code &&
                b.asset_issuer === this.zatbillAsset.issuer);
            if (line) {
                onchain.hasTrustline = true;
                onchain.isAuthorized = Boolean(line.is_authorized);
                onchain.isClawbackEnabled = Boolean(line.is_clawback_enabled);
                onchain.balance = line.balance;
            }
        }
        catch (err) {
            const status = err?.response?.status;
            if (status !== 404) {
                throw err;
            }
        }
        return {
            account,
            verified: Boolean(kycRecord?.verified),
            verifiedAt: kycRecord?.verifiedAt || null,
            revokedAt: kycRecord?.revokedAt || null,
            onchain,
        };
    }
    async transferDemoZatbill(destination, amount = "1") {
        if (!isValidStellarPublicKey(destination)) {
            return {
                success: false,
                account: destination,
                error: "destination must be a valid Stellar account public key.",
                code: "INVALID_DESTINATION",
            };
        }
        return this.enqueue(async () => {
            try {
                const dealerAcc = await this.horizon.loadAccount(this.dealer.publicKey());
                const tx = new stellar_sdk_1.TransactionBuilder(dealerAcc, {
                    fee: stellar_sdk_1.BASE_FEE,
                    networkPassphrase: stellar_sdk_1.Networks.TESTNET,
                })
                    .addOperation(stellar_sdk_1.Operation.payment({
                    destination,
                    asset: this.zatbillAsset,
                    amount,
                }))
                    .setTimeout(60)
                    .build();
                tx.sign(this.dealer);
                const result = await this.horizon.submitTransaction(tx);
                return {
                    success: true,
                    account: destination,
                    amount,
                    transactionHash: result.hash,
                };
            }
            catch (error) {
                const reason = extractHorizonReason(error);
                if (reason.includes("op_not_authorized")) {
                    return {
                        success: false,
                        account: destination,
                        reason: "op_not_authorized",
                        code: "UNAUTHORIZED_RECIPIENT",
                        error: "ZATBILL payment rejected: op_not_authorized. The recipient account is not authorized on the compliance allowlist.",
                    };
                }
                if (reason.includes("op_no_trust") ||
                    reason.includes("op_no_destination")) {
                    return {
                        success: false,
                        account: destination,
                        reason: "op_no_trust",
                        code: "NO_TRUSTLINE",
                        error: "ZATBILL payment rejected: op_no_trust. The recipient account does not have a ZATBILL trustline.",
                    };
                }
                return {
                    success: false,
                    account: destination,
                    reason,
                    error: `ZATBILL transfer failed: ${reason}`,
                };
            }
        });
    }
}
exports.KycService = KycService;
