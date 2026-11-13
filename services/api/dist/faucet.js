"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MzarRateLimiter = exports.MzarRateLimitStoreBusyError = exports.MzarRateLimitStoreError = exports.MzarTrustlineRequiredError = exports.MZAR_FAUCET_COOLDOWN_MS = exports.MZAR_FAUCET_AMOUNT = void 0;
exports.claimMzar = claimMzar;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
exports.MZAR_FAUCET_AMOUNT = "100";
exports.MZAR_FAUCET_COOLDOWN_MS = 24 * 60 * 60 * 1000;
class MzarTrustlineRequiredError extends Error {
    constructor() {
        super("Create an mZAR trustline on Stellar Testnet before requesting tokens.");
        this.name = "MzarTrustlineRequiredError";
    }
}
exports.MzarTrustlineRequiredError = MzarTrustlineRequiredError;
class MzarRateLimitStoreError extends Error {
    constructor(message) {
        super(message);
        this.name = "MzarRateLimitStoreError";
    }
}
exports.MzarRateLimitStoreError = MzarRateLimitStoreError;
class MzarRateLimitStoreBusyError extends MzarRateLimitStoreError {
    constructor() {
        super("The mZAR faucet rate-limit store is busy; no payment was submitted.");
        this.name = "MzarRateLimitStoreBusyError";
    }
}
exports.MzarRateLimitStoreBusyError = MzarRateLimitStoreBusyError;
class MzarRateLimiter {
    statePath;
    nextClaimAt = new Map();
    constructor(statePath) {
        this.statePath = statePath;
        if (statePath) {
            this.loadState();
        }
    }
    claim(account, now) {
        return this.withStateLock(() => {
            for (const [key, nextClaimAt] of this.nextClaimAt) {
                if (nextClaimAt <= now) {
                    this.nextClaimAt.delete(key);
                }
            }
            const key = this.accountKey(account);
            const existing = this.nextClaimAt.get(key);
            if (existing !== undefined && existing > now) {
                return {
                    allowed: false,
                    retryAfterSeconds: Math.ceil((existing - now) / 1000),
                };
            }
            const nextClaimAt = now + exports.MZAR_FAUCET_COOLDOWN_MS;
            this.nextClaimAt.set(key, nextClaimAt);
            this.saveState();
            return { allowed: true, nextClaimAt };
        });
    }
    release(account, expectedNextClaimAt) {
        this.withStateLock(() => {
            const key = this.accountKey(account);
            if (this.nextClaimAt.get(key) === expectedNextClaimAt) {
                this.nextClaimAt.delete(key);
                this.saveState();
            }
        });
    }
    accountKey(account) {
        return (0, node_crypto_1.createHash)("sha256").update(account).digest("hex");
    }
    loadState() {
        if (!this.statePath) {
            return;
        }
        this.nextClaimAt.clear();
        let contents;
        try {
            contents = (0, node_fs_1.readFileSync)(this.statePath, "utf8");
        }
        catch (error) {
            if (typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ENOENT") {
                return;
            }
            throw new Error("Could not read the mZAR faucet rate-limit state file.");
        }
        let parsed;
        try {
            parsed = JSON.parse(contents);
        }
        catch {
            throw new Error("The mZAR faucet rate-limit state file is invalid JSON.");
        }
        if (typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)) {
            throw new Error("The mZAR faucet rate-limit state file has an invalid shape.");
        }
        for (const [key, nextClaimAt] of Object.entries(parsed)) {
            if (!/^[a-f0-9]{64}$/.test(key) ||
                typeof nextClaimAt !== "number" ||
                !Number.isFinite(nextClaimAt)) {
                throw new Error("The mZAR faucet rate-limit state file contains invalid entries.");
            }
            this.nextClaimAt.set(key, nextClaimAt);
        }
    }
    withStateLock(action) {
        if (!this.statePath) {
            return action();
        }
        const lockPath = `${this.statePath}.lock`;
        (0, node_fs_1.mkdirSync)(node_path_1.default.dirname(this.statePath), { recursive: true });
        let lockFd;
        try {
            lockFd = (0, node_fs_1.openSync)(lockPath, "wx", 0o600);
        }
        catch (error) {
            if (this.isErrorCode(error, "EEXIST")) {
                throw new MzarRateLimitStoreBusyError();
            }
            throw new MzarRateLimitStoreError("Could not acquire the mZAR faucet rate-limit store lock.");
        }
        try {
            (0, node_fs_1.writeFileSync)(lockFd, String(process.pid));
            this.loadState();
            return action();
        }
        finally {
            (0, node_fs_1.closeSync)(lockFd);
            (0, node_fs_1.unlinkSync)(lockPath);
        }
    }
    isErrorCode(error, code) {
        return (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === code);
    }
    saveState() {
        if (!this.statePath) {
            return;
        }
        const directory = node_path_1.default.dirname(this.statePath);
        const temporaryPath = `${this.statePath}.${process.pid}.tmp`;
        (0, node_fs_1.mkdirSync)(directory, { recursive: true });
        try {
            (0, node_fs_1.writeFileSync)(temporaryPath, JSON.stringify(Object.fromEntries(this.nextClaimAt)), { encoding: "utf8", mode: 0o600 });
            (0, node_fs_1.renameSync)(temporaryPath, this.statePath);
        }
        catch (error) {
            try {
                (0, node_fs_1.unlinkSync)(temporaryPath);
            }
            catch {
                // A missing temporary file needs no cleanup.
            }
            throw new MzarRateLimitStoreError(`Could not persist the mZAR faucet rate-limit state file: ${error instanceof Error ? error.message : "unknown filesystem error"}`);
        }
    }
}
exports.MzarRateLimiter = MzarRateLimiter;
async function claimMzar(account, limiter, issue, now) {
    const rate = limiter.claim(account, now);
    if (!rate.allowed) {
        return {
            status: 429,
            body: { error: "Faucet limit reached. Try again after the cooldown." },
            retryAfterSeconds: rate.retryAfterSeconds,
        };
    }
    try {
        const transactionHash = await issue(account);
        return {
            status: 200,
            body: {
                amount: exports.MZAR_FAUCET_AMOUNT,
                asset: "MOCK mZAR",
                transactionHash,
            },
        };
    }
    catch (error) {
        if (error instanceof MzarTrustlineRequiredError) {
            limiter.release(account, rate.nextClaimAt);
            return { status: 409, body: { error: error.message } };
        }
        throw error;
    }
}
