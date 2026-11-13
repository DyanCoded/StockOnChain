import { createHash } from "node:crypto";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export const MZAR_FAUCET_AMOUNT = "100";
export const MZAR_FAUCET_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export class MzarTrustlineRequiredError extends Error {
  constructor() {
    super(
      "Create an mZAR trustline on Stellar Testnet before requesting tokens.",
    );
    this.name = "MzarTrustlineRequiredError";
  }
}

export class MzarRateLimitStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MzarRateLimitStoreError";
  }
}

export class MzarRateLimitStoreBusyError extends MzarRateLimitStoreError {
  constructor() {
    super(
      "The mZAR faucet rate-limit store is busy; no payment was submitted.",
    );
    this.name = "MzarRateLimitStoreBusyError";
  }
}

export class MzarRateLimiter {
  private readonly nextClaimAt = new Map<string, number>();

  constructor(private readonly statePath?: string) {
    if (statePath) {
      this.loadState();
    }
  }

  claim(
    account: string,
    now: number,
  ):
    | { allowed: true; nextClaimAt: number }
    | { allowed: false; retryAfterSeconds: number } {
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

      const nextClaimAt = now + MZAR_FAUCET_COOLDOWN_MS;
      this.nextClaimAt.set(key, nextClaimAt);
      this.saveState();
      return { allowed: true, nextClaimAt };
    });
  }

  release(account: string, expectedNextClaimAt: number): void {
    this.withStateLock(() => {
      const key = this.accountKey(account);
      if (this.nextClaimAt.get(key) === expectedNextClaimAt) {
        this.nextClaimAt.delete(key);
        this.saveState();
      }
    });
  }

  private accountKey(account: string): string {
    return createHash("sha256").update(account).digest("hex");
  }

  private loadState(): void {
    if (!this.statePath) {
      return;
    }

    this.nextClaimAt.clear();
    let contents: string;
    try {
      contents = readFileSync(this.statePath, "utf8");
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return;
      }
      throw new Error("Could not read the mZAR faucet rate-limit state file.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(contents) as unknown;
    } catch {
      throw new Error("The mZAR faucet rate-limit state file is invalid JSON.");
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "The mZAR faucet rate-limit state file has an invalid shape.",
      );
    }
    for (const [key, nextClaimAt] of Object.entries(parsed)) {
      if (
        !/^[a-f0-9]{64}$/.test(key) ||
        typeof nextClaimAt !== "number" ||
        !Number.isFinite(nextClaimAt)
      ) {
        throw new Error(
          "The mZAR faucet rate-limit state file contains invalid entries.",
        );
      }
      this.nextClaimAt.set(key, nextClaimAt);
    }
  }

  private withStateLock<T>(action: () => T): T {
    if (!this.statePath) {
      return action();
    }

    const lockPath = `${this.statePath}.lock`;
    mkdirSync(path.dirname(this.statePath), { recursive: true });
    let lockFd: number;
    try {
      lockFd = openSync(lockPath, "wx", 0o600);
    } catch (error) {
      if (this.isErrorCode(error, "EEXIST")) {
        throw new MzarRateLimitStoreBusyError();
      }
      throw new MzarRateLimitStoreError(
        "Could not acquire the mZAR faucet rate-limit store lock.",
      );
    }

    try {
      writeFileSync(lockFd, String(process.pid));
      this.loadState();
      return action();
    } finally {
      closeSync(lockFd);
      unlinkSync(lockPath);
    }
  }

  private isErrorCode(error: unknown, code: string): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === code
    );
  }

  private saveState(): void {
    if (!this.statePath) {
      return;
    }
    const directory = path.dirname(this.statePath);
    const temporaryPath = `${this.statePath}.${process.pid}.tmp`;
    mkdirSync(directory, { recursive: true });
    try {
      writeFileSync(
        temporaryPath,
        JSON.stringify(Object.fromEntries(this.nextClaimAt)),
        { encoding: "utf8", mode: 0o600 },
      );
      renameSync(temporaryPath, this.statePath);
    } catch (error) {
      try {
        unlinkSync(temporaryPath);
      } catch {
        // A missing temporary file needs no cleanup.
      }
      throw new MzarRateLimitStoreError(
        `Could not persist the mZAR faucet rate-limit state file: ${error instanceof Error ? error.message : "unknown filesystem error"}`,
      );
    }
  }
}

export type FaucetClaimResult = {
  status: number;
  body: Record<string, string>;
  retryAfterSeconds?: number;
};

export async function claimMzar(
  account: string,
  limiter: MzarRateLimiter,
  issue: (destination: string) => Promise<string>,
  now: number,
): Promise<FaucetClaimResult> {
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
        amount: MZAR_FAUCET_AMOUNT,
        asset: "MOCK mZAR",
        transactionHash,
      },
    };
  } catch (error) {
    if (error instanceof MzarTrustlineRequiredError) {
      limiter.release(account, rate.nextClaimAt);
      return { status: 409, body: { error: error.message } };
    }
    throw error;
  }
}
