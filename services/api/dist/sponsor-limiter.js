"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SponsorRateLimiter = exports.DEFAULT_SPONSOR_LIMITS = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
exports.DEFAULT_SPONSOR_LIMITS = {
    maxSpendPerUserStroops: 50000000n, // 5.0 XLM max fee / reserve sponsor per user
    maxGlobalSpendStroops: 1000000000n, // 100.0 XLM total global testnet sponsor budget
    maxOperationsPerMinutePerUser: 10,
    windowMs: 60_000,
};
class SponsorRateLimiter {
    filePath;
    config;
    data;
    constructor(filePath, customConfig) {
        this.filePath =
            filePath ||
                process.env.SPONSOR_LIMIT_STATE_PATH?.trim() ||
                node_path_1.default.join(process.cwd(), ".local", "sponsor-limits.json");
        this.config = { ...exports.DEFAULT_SPONSOR_LIMITS, ...customConfig };
        this.data = this.load();
    }
    load() {
        if (!(0, node_fs_1.existsSync)(this.filePath)) {
            return { globalSpentStroops: "0", userUsage: {} };
        }
        try {
            const raw = (0, node_fs_1.readFileSync)(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            return {
                globalSpentStroops: parsed.globalSpentStroops || "0",
                userUsage: parsed.userUsage || {},
            };
        }
        catch {
            return { globalSpentStroops: "0", userUsage: {} };
        }
    }
    save() {
        const dir = node_path_1.default.dirname(this.filePath);
        if (!(0, node_fs_1.existsSync)(dir)) {
            (0, node_fs_1.mkdirSync)(dir, { recursive: true });
        }
        (0, node_fs_1.writeFileSync)(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
    }
    /**
     * Checks whether a sponsorship request for a user is within limits.
     * Throws an Error with a user-friendly message if limits are exceeded.
     */
    checkAllowance(userIdOrAccount, estimatedFeeStroops) {
        const now = Date.now();
        const globalSpent = BigInt(this.data.globalSpentStroops || "0");
        if (globalSpent + estimatedFeeStroops > this.config.maxGlobalSpendStroops) {
            throw new Error("Sponsor budget temporarily reached. Global testnet fee sponsorship quota exceeded.");
        }
        let userRecord = this.data.userUsage[userIdOrAccount];
        if (!userRecord) {
            userRecord = {
                totalSpentStroops: "0",
                operationsInWindow: 0,
                windowStartedAt: now,
                lastOperationAt: 0,
            };
            this.data.userUsage[userIdOrAccount] = userRecord;
        }
        // Check sliding rate limit window
        if (now - userRecord.windowStartedAt > this.config.windowMs) {
            userRecord.operationsInWindow = 0;
            userRecord.windowStartedAt = now;
        }
        if (userRecord.operationsInWindow >= this.config.maxOperationsPerMinutePerUser) {
            throw new Error(`Rate limit exceeded: Please wait before requesting another sponsored transaction (limit ${this.config.maxOperationsPerMinutePerUser} ops/min).`);
        }
        const userSpent = BigInt(userRecord.totalSpentStroops || "0");
        if (userSpent + estimatedFeeStroops > this.config.maxSpendPerUserStroops) {
            throw new Error("User sponsorship limit reached. This account has consumed its testnet fee sponsorship allowance.");
        }
    }
    /**
     * Records completed sponsorship spend.
     */
    recordSpend(userIdOrAccount, actualFeeStroops) {
        const now = Date.now();
        let userRecord = this.data.userUsage[userIdOrAccount];
        if (!userRecord) {
            userRecord = {
                totalSpentStroops: "0",
                operationsInWindow: 0,
                windowStartedAt: now,
                lastOperationAt: now,
            };
            this.data.userUsage[userIdOrAccount] = userRecord;
        }
        if (now - userRecord.windowStartedAt > this.config.windowMs) {
            userRecord.operationsInWindow = 0;
            userRecord.windowStartedAt = now;
        }
        userRecord.operationsInWindow += 1;
        userRecord.lastOperationAt = now;
        userRecord.totalSpentStroops = (BigInt(userRecord.totalSpentStroops || "0") + actualFeeStroops).toString();
        this.data.globalSpentStroops = (BigInt(this.data.globalSpentStroops || "0") + actualFeeStroops).toString();
        this.save();
    }
    getStats(userIdOrAccount) {
        const res = {
            globalSpentStroops: this.data.globalSpentStroops,
        };
        if (userIdOrAccount && this.data.userUsage[userIdOrAccount]) {
            const u = this.data.userUsage[userIdOrAccount];
            res.userSpentStroops = u.totalSpentStroops;
            res.operationsInCurrentWindow = u.operationsInWindow;
        }
        return res;
    }
}
exports.SponsorRateLimiter = SponsorRateLimiter;
