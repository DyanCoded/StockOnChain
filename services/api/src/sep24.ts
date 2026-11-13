/**
 * @stockonchain/api - SEP-10 Stellar Web Authentication & SEP-24 Interactive Anchor Module
 *
 * Implements SEP-10 challenge transaction generation & token verification,
 * alongside SEP-24 interactive deposit and withdrawal transaction lifecycle endpoints.
 *
 * All flows are strictly simulated on Stellar Testnet for mock mZAR.
 */

import {
  Account,
  Keypair,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { randomBytes, createHmac } from "node:crypto";

export interface Sep10ChallengeResponse {
  transaction: string;
  network_passphrase: string;
}

export interface Sep10TokenPayload {
  iss: string;
  sub: string;
  iat: number;
  exp: number;
}

export interface Sep24InfoResponse {
  deposit: Record<
    string,
    {
      enabled: boolean;
      fee_fixed: number;
      fee_percent: number;
      min_amount: number;
      max_amount: number;
    }
  >;
  withdraw: Record<
    string,
    {
      enabled: boolean;
      fee_fixed: number;
      fee_percent: number;
      min_amount: number;
      max_amount: number;
    }
  >;
  fee: {
    enabled: boolean;
  };
}

export type Sep24TransactionStatus =
  | "incomplete"
  | "pending_user_transfer_start"
  | "pending_anchor"
  | "pending_external"
  | "completed"
  | "error";

export interface Sep24Transaction {
  id: string;
  kind: "deposit" | "withdrawal";
  status: Sep24TransactionStatus;
  status_eta?: number;
  amount_in: string;
  amount_out: string;
  amount_fee: string;
  started_at: string;
  completed_at?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  from?: string;
  to?: string;
  withdraw_anchor_account?: string;
  withdraw_memo_type?: "text" | "id" | "hash";
  withdraw_memo?: string;
  payout_rail?: "instant_bank" | "mobile_money";
  payout_recipient?: string;
  message?: string;
}

export interface PayoutSimulationOptions {
  rail: "instant_bank" | "mobile_money";
  recipient: string; // Account number or phone
  bankName?: string;
  amountMzar: number;
}

export interface PayoutSimulationQuote {
  rail: "instant_bank" | "mobile_money";
  railLabel: string;
  amountMzar: number;
  fixedFeeMzar: number;
  percentFeeMzar: number;
  totalFeeMzar: number;
  netPayoutMzar: number;
  estimatedTimeToCashSeconds: number;
  timeToCashLabel: string;
  simulated: true;
  disclaimer: string;
}

export class Sep24Simulator {
  private serverKeypair: Keypair;
  private jwtSecret: string;
  private transactions: Map<string, Sep24Transaction> = new Map();
  private homeDomain: string;

  constructor(options: {
    serverKeypair: Keypair;
    jwtSecret?: string;
    homeDomain?: string;
  }) {
    this.serverKeypair = options.serverKeypair;
    this.jwtSecret =
      options.jwtSecret ||
      process.env.SEP10_JWT_SECRET?.trim() ||
      "stockonchain-testnet-sep10-shared-jwt-secret-demo-32b";
    this.homeDomain = options.homeDomain || process.env.STELLAR_HOME_DOMAIN?.trim() || "stockonchain.test";
  }

  // ==========================================
  // SEP-10 Stellar Web Authentication
  // ==========================================

  /**
   * Generates a SEP-10 challenge transaction for the client account.
   */
  public buildChallengeTransaction(account: string): Sep10ChallengeResponse {
    const now = Math.floor(Date.now() / 1000);
    const validUntil = now + 300; // 5 minute validity
    const nonce = randomBytes(48);

    const challengeSource = new Account(this.serverKeypair.publicKey(), "0");

    const tx = new TransactionBuilder(challengeSource, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
      timebounds: {
        minTime: now,
        maxTime: validUntil,
      },
    })
      .addOperation(
        Operation.manageData({
          source: account,
          name: `${this.homeDomain} auth`,
          value: nonce,
        }),
      )
      .build();

    tx.sign(this.serverKeypair);

    return {
      transaction: tx.toXDR(),
      network_passphrase: Networks.TESTNET,
    };
  }

  /**
   * Validates client signature on SEP-10 challenge and returns a signed authentication token.
   */
  public verifyChallenge(
    challengeXdr: string,
    expectedClientAccount: string,
  ): string {
    const tx = TransactionBuilder.fromXDR(
      challengeXdr,
      Networks.TESTNET,
    ) as Transaction;

    // Verify timebounds
    const now = Math.floor(Date.now() / 1000);
    if (!tx.timeBounds || now < Number(tx.timeBounds.minTime) || now > Number(tx.timeBounds.maxTime)) {
      throw new Error("SEP-10 challenge transaction has expired.");
    }

    // Verify server signature
    const serverHash = tx.hash();
    const serverSigned = tx.signatures.some((sig) =>
      this.serverKeypair.verify(serverHash, sig.signature()),
    );
    if (!serverSigned) {
      throw new Error("Challenge transaction was not signed by this anchor.");
    }

    // Verify client signature
    const clientKeypair = Keypair.fromPublicKey(expectedClientAccount);
    const clientSigned = tx.signatures.some((sig) =>
      clientKeypair.verify(serverHash, sig.signature()),
    );
    if (!clientSigned) {
      throw new Error("Client account signature is missing or invalid on SEP-10 challenge.");
    }

    // Return HMAC-based token (sub = client account)
    const payload: Sep10TokenPayload = {
      iss: `https://${this.homeDomain}`,
      sub: expectedClientAccount,
      iat: now,
      exp: now + 3600, // 1 hour token
    };

    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", this.jwtSecret)
      .update(`${header}.${body}`)
      .digest("base64url");

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verifies and decodes a SEP-10 JWT token.
   */
  public verifyToken(token: string): Sep10TokenPayload {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format.");
    }
    const [header, body, signature] = parts;
    const expectedSig = createHmac("sha256", this.jwtSecret)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSig) {
      throw new Error("Invalid SEP-10 token signature.");
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Sep10TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error("SEP-10 token has expired.");
    }

    return payload;
  }

  // ==========================================
  // SEP-24 Anchor Info & Interactive Endpoints
  // ==========================================

  public getInfo(): Sep24InfoResponse {
    return {
      deposit: {
        mZAR: {
          enabled: true,
          fee_fixed: 0.0,
          fee_percent: 0.0,
          min_amount: 1.0,
          max_amount: 100000.0,
        },
      },
      withdraw: {
        mZAR: {
          enabled: true,
          fee_fixed: 2.5, // R2.50 simulated fixed rail fee
          fee_percent: 0.5, // 0.5% simulated settlement fee
          min_amount: 10.0,
          max_amount: 50000.0,
        },
      },
      fee: {
        enabled: true,
      },
    };
  }

  /**
   * Calculates simulated payout fee and timing metrics.
   */
  public quotePayout(options: PayoutSimulationOptions): PayoutSimulationQuote {
    const fixedFee = options.rail === "instant_bank" ? 2.5 : 1.5;
    const percentRate = options.rail === "instant_bank" ? 0.005 : 0.0075;
    const percentFee = Math.round(options.amountMzar * percentRate * 100) / 100;
    const totalFee = Math.round((fixedFee + percentFee) * 100) / 100;
    const netPayout = Math.max(0, Math.round((options.amountMzar - totalFee) * 100) / 100);

    const isInstant = options.rail === "instant_bank";
    const estSeconds = isInstant ? 30 : 15; // 30s bank, 15s mobile money

    return {
      rail: options.rail,
      railLabel: isInstant
        ? "Simulated Bank Instant Payment (EFT/PayShap-style)"
        : "Simulated Mobile Money Payout",
      amountMzar: options.amountMzar,
      fixedFeeMzar: fixedFee,
      percentFeeMzar: percentFee,
      totalFeeMzar: totalFee,
      netPayoutMzar: netPayout,
      estimatedTimeToCashSeconds: estSeconds,
      timeToCashLabel: `~${estSeconds} seconds (Simulated)`,
      simulated: true,
      disclaimer:
        "SIMULATION ONLY: This is a demonstration flow on Stellar Testnet. No real South African rands or live bank transactions occur.",
    };
  }

  /**
   * Initiates an interactive withdrawal session (SEP-24 POST /transactions/withdraw/interactive).
   */
  public initiateWithdrawal(params: {
    account: string;
    amount: string;
    asset_code: string;
    rail?: "instant_bank" | "mobile_money";
    recipient?: string;
  }): { id: string; url: string; type: string } {
    if (params.asset_code !== "mZAR") {
      throw new Error(`Unsupported withdrawal asset: ${params.asset_code}`);
    }

    const txId = `soc_w_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const quote = this.quotePayout({
      rail: params.rail || "instant_bank",
      recipient: params.recipient || "Simulated Recipient",
      amountMzar: parseFloat(params.amount) || 100,
    });

    const txRecord: Sep24Transaction = {
      id: txId,
      kind: "withdrawal",
      status: "pending_user_transfer_start",
      status_eta: quote.estimatedTimeToCashSeconds,
      amount_in: params.amount,
      amount_out: quote.netPayoutMzar.toFixed(2),
      amount_fee: quote.totalFeeMzar.toFixed(2),
      started_at: new Date().toISOString(),
      from: params.account,
      withdraw_anchor_account: this.serverKeypair.publicKey(),
      withdraw_memo_type: "text",
      withdraw_memo: txId.slice(0, 28),
      payout_rail: quote.rail,
      payout_recipient: params.recipient,
      message: "Please submit mZAR on Testnet to the anchor account to release simulated payout.",
    };

    this.transactions.set(txId, txRecord);

    const interactiveUrl = `https://${this.homeDomain}/cashout?transaction_id=${txId}`;
    return {
      id: txId,
      url: interactiveUrl,
      type: "interactive_customer_info_needed",
    };
  }

  /**
   * Simulates the anchor detecting on-chain mZAR receipt and executing the local payout rail.
   */
  public executeSimulatedPayout(
    txId: string,
    stellarTxHash: string,
  ): Sep24Transaction {
    const tx = this.transactions.get(txId);
    if (!tx) {
      throw new Error(`Transaction not found: ${txId}`);
    }

    tx.status = "completed";
    tx.stellar_transaction_id = stellarTxHash;
    tx.external_transaction_id = `sim_payout_${Date.now()}_${randomBytes(4).toString("hex")}`;
    tx.completed_at = new Date().toISOString();
    tx.message = `Simulated payout of R ${tx.amount_out} completed via ${tx.payout_rail} rail.`;

    this.transactions.set(txId, tx);
    return tx;
  }

  /**
   * Queries a SEP-24 transaction by ID.
   */
  public getTransaction(id: string): Sep24Transaction | null {
    return this.transactions.get(id) || null;
  }

  /**
   * Initiates an interactive deposit session (SEP-24 POST /transactions/deposit/interactive).
   * Serves as an alternative top-up path to the faucet.
   */
  public initiateDeposit(params: {
    account: string;
    amount: string;
    asset_code: string;
  }): { id: string; url: string; type: string } {
    if (params.asset_code !== "mZAR") {
      throw new Error(`Unsupported deposit asset: ${params.asset_code}`);
    }

    const txId = `soc_d_${Date.now()}_${randomBytes(4).toString("hex")}`;
    const txRecord: Sep24Transaction = {
      id: txId,
      kind: "deposit",
      status: "pending_anchor",
      amount_in: params.amount,
      amount_out: params.amount,
      amount_fee: "0.00",
      started_at: new Date().toISOString(),
      to: params.account,
      message: "Simulated deposit top-up pending anchor crediting.",
    };

    this.transactions.set(txId, txRecord);

    return {
      id: txId,
      url: `https://${this.homeDomain}/deposit?transaction_id=${txId}`,
      type: "interactive_customer_info_needed",
    };
  }
}
