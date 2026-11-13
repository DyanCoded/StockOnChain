"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustodialWalletStore = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const custody_js_1 = require("./custody.js");
const stellar_sdk_1 = require("@stellar/stellar-sdk");
class CustodialWalletStore {
    filePath;
    encryptionKey;
    data;
    constructor(filePath, encryptionKeyString) {
        this.filePath =
            filePath ||
                process.env.WALLET_STORE_PATH?.trim() ||
                node_path_1.default.join(process.cwd(), ".local", "custodial-wallets.json");
        this.encryptionKey = (0, custody_js_1.parseEncryptionKey)(encryptionKeyString);
        this.data = this.load();
    }
    load() {
        if (!(0, node_fs_1.existsSync)(this.filePath)) {
            return { wallets: {}, userByPublicKey: {} };
        }
        try {
            const raw = (0, node_fs_1.readFileSync)(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            return {
                wallets: parsed.wallets || {},
                userByPublicKey: parsed.userByPublicKey || {},
            };
        }
        catch {
            return { wallets: {}, userByPublicKey: {} };
        }
    }
    save() {
        const dir = node_path_1.default.dirname(this.filePath);
        if (!(0, node_fs_1.existsSync)(dir)) {
            (0, node_fs_1.mkdirSync)(dir, { recursive: true });
        }
        (0, node_fs_1.writeFileSync)(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
    }
    getOrCreateWallet(userId) {
        const existing = this.data.wallets[userId];
        if (existing) {
            return {
                publicKey: existing.publicKey,
                isNew: false,
                createdAt: existing.createdAt,
            };
        }
        const record = (0, custody_js_1.generateCustodialKeypair)(userId, this.encryptionKey);
        this.data.wallets[userId] = record;
        this.data.userByPublicKey[record.publicKey] = userId;
        this.save();
        return {
            publicKey: record.publicKey,
            isNew: true,
            createdAt: record.createdAt,
        };
    }
    getWalletByUserId(userId) {
        const record = this.data.wallets[userId];
        if (!record)
            return null;
        return {
            publicKey: record.publicKey,
            createdAt: record.createdAt,
        };
    }
    getWalletByPublicKey(publicKey) {
        const userId = this.data.userByPublicKey[publicKey];
        if (!userId)
            return null;
        const record = this.data.wallets[userId];
        if (!record)
            return null;
        return {
            userId,
            createdAt: record.createdAt,
        };
    }
    /**
     * Loads the decrypted Keypair in memory solely for transient signing.
     * Never returned or written to disk or logs.
     */
    loadTransientKeypair(userIdOrPublicKey) {
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
        const secret = (0, custody_js_1.decryptSecret)(record.encryptedSecret, this.encryptionKey);
        return stellar_sdk_1.Keypair.fromSecret(secret);
    }
}
exports.CustodialWalletStore = CustodialWalletStore;
