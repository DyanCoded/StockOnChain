import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

export interface EncryptedPayload {
  ciphertext: string; // hex
  iv: string; // hex
  tag: string; // hex
}

/**
 * Derives a 32-byte Buffer encryption key from a string or returns buffer if already 32 bytes.
 * Throws if the key is invalid or not 32 bytes (256 bits).
 */
export function parseEncryptionKey(keyString?: string): Buffer {
  const secret = keyString || process.env.WALLET_ENCRYPTION_KEY?.trim();
  if (!secret) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY is required for custodial wallet encryption. Set it in .env or provide as argument.",
    );
  }

  // Support 64-char hex string (32 bytes) or utf-8 32-byte string
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  const buf = Buffer.from(secret, "utf-8");
  if (buf.length !== 32) {
    throw new Error(
      `WALLET_ENCRYPTION_KEY must be exactly 32 bytes (or 64 hex characters). Received ${buf.length} bytes.`,
    );
  }
  return buf;
}

/**
 * Encrypts a secret string (e.g. Stellar secret key) using AES-256-GCM.
 * Never logs or prints the plaintext.
 */
export function encryptSecret(
  plaintext: string,
  key: Buffer,
): EncryptedPayload {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload back to plaintext.
 * Never logs or prints the plaintext.
 */
export function decryptSecret(
  payload: EncryptedPayload,
  key: Buffer,
): string {
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  const ciphertext = Buffer.from(payload.ciphertext, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export interface CustodialWalletRecord {
  userId: string;
  publicKey: string;
  encryptedSecret: EncryptedPayload;
  createdAt: number;
}

/**
 * Generates a new Stellar keypair and encrypts the secret key using WALLET_ENCRYPTION_KEY.
 * Returns the public key and encrypted payload. Never returns or logs the secret key.
 */
export function generateCustodialKeypair(
  userId: string,
  key: Buffer,
): CustodialWalletRecord {
  const keypair = Keypair.random();
  const encryptedSecret = encryptSecret(keypair.secret(), key);
  return {
    userId,
    publicKey: keypair.publicKey(),
    encryptedSecret,
    createdAt: Date.now(),
  };
}
