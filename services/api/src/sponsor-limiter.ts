import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface SponsorLimitConfig {
  maxSpendPerUserStroops: bigint; // e.g. 10_000_000n (1 XLM)
  maxGlobalSpendStroops: bigint; // e.g. 1_000_000_000n (100 XLM)
  maxOperationsPerMinutePerUser: number; // e.g. 5
  windowMs: number; // 60_000ms
}

export const DEFAULT_SPONSOR_LIMITS: SponsorLimitConfig = {
  maxSpendPerUserStroops: 50_000_000n, // 5.0 XLM max fee / reserve sponsor per user
  maxGlobalSpendStroops: 1_000_000_000n, // 100.0 XLM total global testnet sponsor budget
  maxOperationsPerMinutePerUser: 10,
  windowMs: 60_000,
};

export interface SponsorUsageRecord {
  totalSpentStroops: string;
  operationsInWindow: number;
  windowStartedAt: number;
  lastOperationAt: number;
}

export interface SponsorStoreData {
  globalSpentStroops: string;
  userUsage: Record<string, SponsorUsageRecord>;
}

export class SponsorRateLimiter {
  private filePath: string;
  private config: SponsorLimitConfig;
  private data: SponsorStoreData;

  constructor(filePath?: string, customConfig?: Partial<SponsorLimitConfig>) {
    this.filePath =
      filePath ||
      process.env.SPONSOR_LIMIT_STATE_PATH?.trim() ||
      path.join(process.cwd(), ".local", "sponsor-limits.json");

    this.config = { ...DEFAULT_SPONSOR_LIMITS, ...customConfig };
    this.data = this.load();
  }

  private load(): SponsorStoreData {
    if (!existsSync(this.filePath)) {
      return { globalSpentStroops: "0", userUsage: {} };
    }
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<SponsorStoreData>;
      return {
        globalSpentStroops: parsed.globalSpentStroops || "0",
        userUsage: parsed.userUsage || {},
      };
    } catch {
      return { globalSpentStroops: "0", userUsage: {} };
    }
  }

  private save(): void {
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  /**
   * Checks whether a sponsorship request for a user is within limits.
   * Throws an Error with a user-friendly message if limits are exceeded.
   */
  public checkAllowance(userIdOrAccount: string, estimatedFeeStroops: bigint): void {
    const now = Date.now();
    const globalSpent = BigInt(this.data.globalSpentStroops || "0");

    if (globalSpent + estimatedFeeStroops > this.config.maxGlobalSpendStroops) {
      throw new Error(
        "Sponsor budget temporarily reached. Global testnet fee sponsorship quota exceeded.",
      );
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
      throw new Error(
        `Rate limit exceeded: Please wait before requesting another sponsored transaction (limit ${this.config.maxOperationsPerMinutePerUser} ops/min).`,
      );
    }

    const userSpent = BigInt(userRecord.totalSpentStroops || "0");
    if (userSpent + estimatedFeeStroops > this.config.maxSpendPerUserStroops) {
      throw new Error(
        "User sponsorship limit reached. This account has consumed its testnet fee sponsorship allowance.",
      );
    }
  }

  /**
   * Records completed sponsorship spend.
   */
  public recordSpend(userIdOrAccount: string, actualFeeStroops: bigint): void {
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
    userRecord.totalSpentStroops = (
      BigInt(userRecord.totalSpentStroops || "0") + actualFeeStroops
    ).toString();

    this.data.globalSpentStroops = (
      BigInt(this.data.globalSpentStroops || "0") + actualFeeStroops
    ).toString();

    this.save();
  }

  public getStats(userIdOrAccount?: string): {
    globalSpentStroops: string;
    userSpentStroops?: string;
    operationsInCurrentWindow?: number;
  } {
    const res: {
      globalSpentStroops: string;
      userSpentStroops?: string;
      operationsInCurrentWindow?: number;
    } = {
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
