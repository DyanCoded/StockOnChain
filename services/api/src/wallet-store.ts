import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  CustodialWalletRecord,
  decryptSecret,
  generateCustodialKeypair,
  parseEncryptionKey,
} from "./custody.js";
import { Keypair } from "@stellar/stellar-sdk";

export interface WalletStoreData {
  wallets: Record<string, CustodialWalletRecord>; // keyed by userId
  userByPublicKey: Record<string, string>; // mapping publicKey -> userId
}

export class CustodialWalletStore {
  private filePath: string;
  private encryptionKey: Buffer;
  private data: WalletStoreData;

  constructor(filePath?: string, encryptionKeyString?: string) {
    this.filePath =
      filePath ||
      process.env.WALLET_STORE_PATH?.trim() ||
      path.join(process.cwd(), ".local", "custodial-wallets.json");

    this.encryptionKey = parseEncryptionKey(encryptionKeyString);
    this.data = this.load();
  }

  private load(): WalletStoreData {
    if (!existsSync(this.filePath)) {
      return { wallets: {}, userByPublicKey: {} };
    }
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<WalletStoreData>;
      return {
        wallets: parsed.wallets || {},
        userByPublicKey: parsed.userByPublicKey || {},
      };
    } catch {
      return { wallets: {}, userByPublicKey: {} };
    }
  }

  private save(): void {
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  public getOrCreateWallet(userId: string): {
    publicKey: string;
    isNew: boolean;
    createdAt: number;
  } {
    const existing = this.data.wallets[userId];
    if (existing) {
      return {
        publicKey: existing.publicKey,
        isNew: false,
        createdAt: existing.createdAt,
      };
    }

    const record = generateCustodialKeypair(userId, this.encryptionKey);
    this.data.wallets[userId] = record;
    this.data.userByPublicKey[record.publicKey] = userId;
    this.save();

    return {
      publicKey: record.publicKey,
      isNew: true,
      createdAt: record.createdAt,
    };
  }

  public getWalletByUserId(userId: string): {
    publicKey: string;
    createdAt: number;
  } | null {
    const record = this.data.wallets[userId];
    if (!record) return null;
    return {
      publicKey: record.publicKey,
      createdAt: record.createdAt,
    };
  }

  public getWalletByPublicKey(publicKey: string): {
    userId: string;
    createdAt: number;
  } | null {
    const userId = this.data.userByPublicKey[publicKey];
    if (!userId) return null;
    const record = this.data.wallets[userId];
    if (!record) return null;
    return {
      userId,
      createdAt: record.createdAt,
    };
  }

  /**
   * Loads the decrypted Keypair in memory solely for transient signing.
   * Never returned or written to disk or logs.
   */
  public loadTransientKeypair(userIdOrPublicKey: string): Keypair {
    let record = this.data.wallets[userIdOrPublicKey];
    if (!record) {
      const userId = this.data.userByPublicKey[userIdOrPublicKey];
      if (userId) {
        record = this.data.wallets[userId];
      }
    }

    if (!record) {
      throw new Error("No custodial wallet registered for the specified user or public key.");
    }

    const secret = decryptSecret(record.encryptedSecret, this.encryptionKey);
    return Keypair.fromSecret(secret);
  }
}
