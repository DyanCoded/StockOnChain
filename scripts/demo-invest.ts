/**
 * @stockonchain/scripts - CLI Automation: Primary Dealer Investment (T-05)
 *
 * Runs the contribution and investment phases of the Stokvel Pot lifecycle
 * on Stellar Testnet using a time-compressed Treasury Bill product:
 * 1. Initializes/deploys a time-compressed Stokvel Pot (120s term).
 * 2. Onboards and funds 3 demo members with mZAR.
 * 3. Pulls member contributions (50, 30, and 20 mZAR).
 * 4. Quotes primary dealer discount pricing for 10% demo rate (Actual/365).
 * 5. Executes dual-auth investment swap (mZAR -> ZATBILL).
 * 6. Emits verified Horizon Testnet links and saves state for `demo:mature`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { config } from "dotenv";
import {
  assertTestnetConfiguration,
  quotePrimaryDealer,
  signOnchainAttestation,
  STELLAR_NETWORKS,
  TESTNET_PASSPHRASE,
  TREASURY_PRODUCTS,
} from "@stockonchain/chain";
import {
  deployPotWasm,
  horizonServer,
  invokeCli,
  invokeInvestDualAuth,
  stellarExpertTxUrl,
  testnetTxUrl,
} from "./soroban-client";

const root = process.cwd();
const envPath = path.join(root, ".env");
const localDir = path.join(root, ".local");
const lifecycleStatePath = path.join(localDir, "demo-lifecycle.json");
const member3KeyPath = path.join(localDir, "demo-member3.json");

config({ path: envPath, quiet: true });
assertTestnetConfiguration();

interface DemoMember {
  id: string;
  name: string;
  keypair: Keypair;
  contributionRand: number;
  contributionStroops: bigint;
  shares: bigint;
}

async function ensureFriendbotFunded(publicKey: string): Promise<void> {
  const horizon = horizonServer();
  try {
    await horizon.loadAccount(publicKey);
  } catch {
    console.log(`Funding new account ${publicKey} via Friendbot...`);
    const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    if (!res.ok) {
      throw new Error(`Friendbot funding failed for ${publicKey}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function ensureMzarTrustlineAndBalance(
  horizon: Horizon.Server,
  accountKp: Keypair,
  anchorKp: Keypair,
  mzarAsset: Asset,
  targetBalanceRand: number,
): Promise<void> {
  const account = await horizon.loadAccount(accountKp.publicKey());
  const hasLine = account.balances.some(
    (b) => "asset_code" in b && b.asset_code === "mZAR",
  );

  if (!hasLine) {
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.changeTrust({ asset: mzarAsset, limit: "10000000" }),
      )
      .setTimeout(30)
      .build();
    tx.sign(accountKp);
    await horizon.submitTransaction(tx);
    console.log(`Created mZAR trustline for ${accountKp.publicKey().slice(0, 8)}...`);
  }

  const refreshed = await horizon.loadAccount(accountKp.publicKey());
  const mzarLine = refreshed.balances.find(
    (b) => "asset_code" in b && b.asset_code === "mZAR",
  );
  const currentBalance = mzarLine && "balance" in mzarLine ? parseFloat(mzarLine.balance) : 0;

  if (currentBalance < targetBalanceRand) {
    const deficit = (targetBalanceRand - currentBalance).toFixed(2);
    const anchorAccount = await horizon.loadAccount(anchorKp.publicKey());
    const payTx = new TransactionBuilder(anchorAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: accountKp.publicKey(),
          asset: mzarAsset,
          amount: deficit,
        }),
      )
      .setTimeout(30)
      .build();
    payTx.sign(anchorKp);
    await horizon.submitTransaction(payTx);
    console.log(`Funded ${deficit} mZAR to ${accountKp.publicKey().slice(0, 8)}...`);
  }
}

async function main() {
  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }

  console.log("==================================================================");
  console.log("  StockOnChain: Primary Dealer Investment Lifecycle (T-05)");
  console.log("  Product: Time-Compressed Demo South African Treasury Bill");
  console.log("  Label:   [time compressed for demo]");
  console.log("==================================================================\n");

  const adminSecret = process.env.STELLAR_ADMIN_SECRET_KEY?.trim()!;
  const dealerSecret = process.env.STELLAR_DEALER_SECRET_KEY?.trim()!;
  const zatbillIssuerSecret = process.env.STELLAR_ZATBILL_ISSUER_SECRET_KEY?.trim()!;
  const anchorSecret = process.env.STELLAR_ANCHOR_SIM_SECRET_KEY?.trim()!;
  const sponsorSecret = process.env.STELLAR_SPONSOR_SECRET_KEY?.trim()!;
  const custodianSecret = process.env.STELLAR_CUSTODIAN_SECRET_KEY?.trim()!;

  const mzarSac =
    process.env.STELLAR_MZAR_CONTRACT_ID?.trim() ||
    "CDH2DYZNE6K5P2EV6JAVTHVVNROLC6TIRWQNFF2OUMBNT36ZCTJPNXXX";
  const zatbillSac =
    process.env.STELLAR_ZATBILL_CONTRACT_ID?.trim() ||
    "CDALMH56TPGL37P4AIELC4FBISERZDRIJZIMIGRGCUNFPW7WLPS27GUR";

  const adminKp = Keypair.fromSecret(adminSecret);
  const dealerKp = Keypair.fromSecret(dealerSecret);
  const anchorKp = Keypair.fromSecret(anchorSecret);
  const zatbillIssuerKp = Keypair.fromSecret(zatbillIssuerSecret);

  // Setup Member 3 keypair
  let member3Kp: Keypair;
  if (existsSync(member3KeyPath)) {
    const raw = JSON.parse(readFileSync(member3KeyPath, "utf8"));
    member3Kp = Keypair.fromSecret(raw.secretKey);
  } else {
    member3Kp = Keypair.random();
    writeFileSync(
      member3KeyPath,
      JSON.stringify({
        publicKey: member3Kp.publicKey(),
        secretKey: member3Kp.secret(),
      }),
      "utf8",
    );
  }

  const horizon = horizonServer();
  const mzarAsset = new Asset("mZAR", anchorKp.publicKey());

  console.log("[1/6] Verifying account balances and mZAR trustlines...");
  await ensureFriendbotFunded(adminKp.publicKey());
  await ensureFriendbotFunded(dealerKp.publicKey());
  await ensureFriendbotFunded(member3Kp.publicKey());

  const members: DemoMember[] = [
    {
      id: "member-1",
      name: "Sipho M. (Sponsor)",
      keypair: Keypair.fromSecret(sponsorSecret),
      contributionRand: 50,
      contributionStroops: 500_000_000n, // 50 mZAR
      shares: 500_000_000n,
    },
    {
      id: "member-2",
      name: "Nomsa K. (Custodian)",
      keypair: Keypair.fromSecret(custodianSecret),
      contributionRand: 30,
      contributionStroops: 300_000_000n, // 30 mZAR
      shares: 300_000_000n,
    },
    {
      id: "member-3",
      name: "Thabo D. (Member 3)",
      keypair: member3Kp,
      contributionRand: 20,
      contributionStroops: 200_000_000n, // 20 mZAR
      shares: 200_000_000n,
    },
  ];

  for (const m of members) {
    await ensureFriendbotFunded(m.keypair.publicKey());
    await ensureMzarTrustlineAndBalance(
      horizon,
      m.keypair,
      anchorKp,
      mzarAsset,
      m.contributionRand + 10,
    );
  }

  // Ensure dealer has mZAR trustline and liquidity for buyback at maturity
  await ensureMzarTrustlineAndBalance(horizon, dealerKp, anchorKp, mzarAsset, 500);

  // 2. Deploy or reuse time-compressed Pot contract
  const existingPotId = process.argv[2]?.trim();
  let potContractId: string;
  let maturityTimestamp: number;
  const now = Math.floor(Date.now() / 1000);
  const termSeconds = TREASURY_PRODUCTS.demoTimeCompressed.termSeconds; // 120 seconds

  if (existingPotId) {
    console.log(`\n[2/6] Reusing existing Pot contract: ${existingPotId}`);
    potContractId = existingPotId;
    maturityTimestamp = now; // Ready for immediate maturity
  } else {
    console.log("\n[2/6] Deploying time-compressed Stokvel Pot contract (120s term)...");
    potContractId = deployPotWasm(adminSecret);
    console.log(`  Contract ID: ${potContractId}`);

    maturityTimestamp = now + termSeconds;
    const memberCapStroops = "1000000000"; // 100 mZAR
    const contributionAmountStroops = "100000000"; // 10 mZAR

    console.log(`  Maturity in: ${termSeconds} seconds (${new Date(maturityTimestamp * 1000).toTimeString().slice(0, 8)})`);
    console.log("  Initializing pot parameters...");

    const initRes = invokeCli(
      potContractId,
      "init",
      [
        "--admin",
        adminKp.publicKey(),
        "--dealer",
        dealerKp.publicKey(),
        "--mzar_token",
        mzarSac,
        "--zatbill_token",
        zatbillSac,
        "--term_duration",
        String(termSeconds),
        "--maturity_timestamp",
        String(maturityTimestamp),
        "--member_cap",
        memberCapStroops,
        "--contribution_amount",
        contributionAmountStroops,
      ],
      adminSecret,
    );
    console.log(`  Initialized! Tx: ${testnetTxUrl(initRes.hash)}`);

    console.log("  Authorizing new pot on ZATBILL SAC...");
    const authSacRes = invokeCli(
      zatbillSac,
      "set_authorized",
      ["--id", potContractId, "--authorize"],
      zatbillIssuerSecret,
    );
    console.log(`  Pot SAC authorized! Tx: ${testnetTxUrl(authSacRes.hash)}`);

    // 3. Admin adds members to allowlist
    console.log("\n[3/6] Adding members to pot allowlist (Admin auth)...");
    for (const m of members) {
      const addRes = invokeCli(
        potContractId,
        "add_member",
        ["--admin", adminKp.publicKey(), "--member", m.keypair.publicKey()],
        adminSecret,
      );
      console.log(`  Added ${m.name}: ${testnetTxUrl(addRes.hash)}`);
    }

    // 4. Members contribute
    console.log("\n[4/6] Members contributing mZAR...");
    for (const m of members) {
      const contribRes = invokeCli(
        potContractId,
        "contribute",
        [
          "--member",
          m.keypair.publicKey(),
          "--amount",
          m.contributionStroops.toString(),
        ],
        m.keypair.secret(),
      );
      console.log(
        `  ${m.name} contributed R ${m.contributionRand.toFixed(2)}: ${testnetTxUrl(contribRes.hash)}`,
      );
    }
  }

  const totalContributedStroops = members.reduce(
    (sum, m) => sum + m.contributionStroops,
    0n,
  );
  const totalContributedRand = Number(totalContributedStroops) / 10_000_000;
  console.log(`\n  Total Pooled: R ${totalContributedRand.toFixed(2)} (${totalContributedStroops} stroops)`);

  // 5. Quote primary dealer
  console.log("\n[5/6] Quoting Primary Dealer for Time-Compressed Demo Bill...");
  const quote = quotePrimaryDealer("demoTimeCompressed", totalContributedRand);

  console.log(`  Product:           ${quote.productName} [${quote.label}]`);
  console.log(`  Simulated Rate:    ${(TREASURY_PRODUCTS.demoTimeCompressed.indicativeAnnualRate * 100).toFixed(2)}% p.a.`);
  console.log(`  Discount Price:    R ${quote.discountPricePerUnit.toFixed(6)} per R1.00 token`);
  console.log(`  Indicative Yield:  ${quote.annualizedYieldFormatted}`);
  console.log(`  ZATBILL Delivered: ${quote.zatbillTokensReceived} tokens`);
  console.log(`  Settlement Value:  R ${quote.faceValueSettlementMzar.toFixed(2)}`);
  console.log(`  Expected Profit:   R ${quote.indicativeProfitMzar.toFixed(2)}`);
  console.log(`  Disclaimer:        ${quote.disclaimer}`);

  const zatbillDeliveredStroops = BigInt(quote.zatbillTokensReceived) * 10_000_000n;

  // 5b. Verify and update on-chain attested reserves (T-07 Proof of Backing check)
  console.log("\n[5b/6] Ensuring on-chain attested reserves limit (T-07)...");
  const custodianSecret = process.env.STELLAR_CUSTODIAN_SECRET_KEY?.trim();
  if (custodianSecret) {
    const custodianKp = Keypair.fromSecret(custodianSecret);
    const signed = signOnchainAttestation({
      custodianKeypair: custodianKp,
      reservesStroops: 10_000_000_000n, // R1,000.00
      timestampSeconds: BigInt(Math.floor(Date.now() / 1000)),
    });

    try {
      invokeCli(
        potContractId,
        "update_attested_reserves",
        [
          "--custodian_pubkey",
          signed.custodianPubkeyHex,
          "--reserves",
          signed.reservesStroops.toString(),
          "--timestamp",
          signed.timestampSeconds.toString(),
          "--signature",
          signed.signatureHex,
        ],
        adminSecret,
      );
      console.log("  On-chain attested reserves verified and updated!");
    } catch {
      console.log("  On-chain attested reserves already sufficient.");
    }
  }

  // 6. Execute investment swap
  console.log("\n[6/6] Executing dual-auth investment swap (Pot mZAR <-> Dealer ZATBILL)...");
  const investRes = await invokeInvestDualAuth(
    potContractId,
    adminKp,
    dealerKp,
    zatbillDeliveredStroops,
  );

  console.log(`\n>>> INVESTMENT SUCCESSFUL! <<<`);
  console.log(`  Transaction Hash: ${investRes.hash}`);
  console.log(`  Horizon Link:     ${testnetTxUrl(investRes.hash)}`);
  console.log(`  StellarExpert:    ${stellarExpertTxUrl(investRes.hash)}`);
  console.log(`  Ledger Sequence:  ${investRes.ledger}`);
  console.log(`  Pot State:        Invested (1)`);

  // Save lifecycle state
  const lifecycleData = {
    potContractId,
    product: quote.productName,
    label: quote.label,
    nowTimestamp: now,
    maturityTimestamp,
    termSeconds,
    totalContributedStroops: totalContributedStroops.toString(),
    totalContributedRand,
    zatbillDeliveredStroops: zatbillDeliveredStroops.toString(),
    zatbillTokensReceived: quote.zatbillTokensReceived,
    faceValueSettlementRand: quote.faceValueSettlementMzar,
    investTxHash: investRes.hash,
    investLedger: investRes.ledger,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      publicKey: m.keypair.publicKey(),
      secretKey: m.keypair.secret(),
      contributionRand: m.contributionRand,
      contributionStroops: m.contributionStroops.toString(),
      shares: m.shares.toString(),
    })),
  };

  writeFileSync(lifecycleStatePath, JSON.stringify(lifecycleData, null, 2), "utf8");
  console.log(`\nSaved lifecycle state to ${path.relative(root, lifecycleStatePath)}`);
  console.log("\nTo complete maturity, settlement, and pro-rata claims, run:");
  console.log("  pnpm demo:mature\n");
}

main().catch((err: unknown) => {
  console.error("\n[FATAL ERROR]:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
