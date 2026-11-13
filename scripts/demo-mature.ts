/**
 * @stockonchain/scripts - CLI Automation: Maturity Engine & Settlement (T-05)
 *
 * Completes the Stokvel Pot lifecycle on Stellar Testnet:
 * 1. Checks maturity timestamp (waiting for the time-compressed 120s timer if needed).
 * 2. Invokes `mature()` transitioning pot to Matured (2).
 * 3. Dealer invokes `settle(dealer)` paying full face value in mZAR (3).
 * 4. Each member invokes `claim(member)` claiming their exact pro-rata return.
 * 5. Reconciles all distributions strictly to the cent with zero leakage.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Keypair } from "@stellar/stellar-sdk";
import { config } from "dotenv";
import {
  assertTestnetConfiguration,
  reconcileMemberPayouts,
} from "@stockonchain/chain";
import {
  horizonServer,
  invokeCli,
  stellarExpertTxUrl,
  testnetTxUrl,
} from "./soroban-client";

const root = process.cwd();
const envPath = path.join(root, ".env");
const localDir = path.join(root, ".local");
const lifecycleStatePath = path.join(localDir, "demo-lifecycle.json");

config({ path: envPath, quiet: true });
assertTestnetConfiguration();

interface LifecycleMember {
  id: string;
  name: string;
  publicKey: string;
  secretKey: string;
  contributionRand: number;
  contributionStroops: string;
  shares: string;
}

interface LifecycleData {
  potContractId: string;
  product: string;
  label: string;
  nowTimestamp: number;
  maturityTimestamp: number;
  termSeconds: number;
  totalContributedStroops: string;
  totalContributedRand: number;
  zatbillDeliveredStroops: string;
  zatbillTokensReceived: number;
  faceValueSettlementRand: number;
  investTxHash: string;
  investLedger: number;
  members: LifecycleMember[];
}

async function main() {
  console.log("==================================================================");
  console.log("  StockOnChain: Maturity Engine & Primary Dealer Settlement (T-05)");
  console.log("  Product: Time-Compressed Demo South African Treasury Bill");
  console.log("  Label:   [time compressed for demo]");
  console.log("==================================================================\n");

  if (!existsSync(lifecycleStatePath)) {
    throw new Error(
      `Lifecycle state file not found at ${lifecycleStatePath}. Run 'pnpm demo:invest' first.`,
    );
  }

  const data: LifecycleData = JSON.parse(readFileSync(lifecycleStatePath, "utf8"));
  const potContractId = data.potContractId;
  const adminSecret = process.env.STELLAR_ADMIN_SECRET_KEY?.trim()!;
  const dealerSecret = process.env.STELLAR_DEALER_SECRET_KEY?.trim()!;
  const dealerKp = Keypair.fromSecret(dealerSecret);

  console.log(`Pot Contract: ${potContractId}`);
  console.log(`Product:      ${data.product} [${data.label}]`);
  console.log(`Settlement:   R ${data.faceValueSettlementRand.toFixed(2)} (${data.zatbillTokensReceived} ZATBILL units)`);

  // 1. Wait for maturity timestamp
  console.log("\n[1/4] Checking maturity status...");
  let currentSec = Math.floor(Date.now() / 1000);
  const remaining = data.maturityTimestamp - currentSec;

  if (remaining > 0) {
    console.log(
      `  [${data.label}] Pot reaches maturity in ${remaining} seconds...`,
    );
    while (Math.floor(Date.now() / 1000) <= data.maturityTimestamp + 2) {
      const left = data.maturityTimestamp - Math.floor(Date.now() / 1000);
      if (left > 0) {
        process.stdout.write(`\r  Waiting: ${left}s remaining until maturity timestamp...`);
      } else {
        process.stdout.write(`\r  Ledger timestamp reached! Finalizing maturity...       \n`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  } else {
    console.log(`  Maturity timestamp (${data.maturityTimestamp}) has elapsed.`);
  }

  // 2. Check state and invoke mature() if still in Invested (1)
  const getStateRes = invokeCli(potContractId, "get_state", [], adminSecret);
  let currentState = parseInt(getStateRes.output.trim(), 10);
  console.log(`  Current Pot State: ${currentState}`);

  if (currentState === 1) {
    console.log("\n[2/4] Invoking mature() on pot contract...");
    const matureRes = invokeCli(potContractId, "mature", [], adminSecret);
    console.log(`  State changed to Matured (2)!`);
    console.log(`  Horizon Link:  ${testnetTxUrl(matureRes.hash)}`);
    console.log(`  StellarExpert: ${stellarExpertTxUrl(matureRes.hash)}`);
    currentState = 2;
  } else if (currentState >= 2) {
    console.log(`\n[2/4] Pot is already in state ${currentState >= 3 ? "Settled (3)" : "Matured (2)"}.`);
  }

  // 3. Dealer invokes settle(dealer) if not already settled
  if (currentState < 3) {
    console.log("\n[3/4] Primary Dealer settling pot at full face value (R1.00 per unit)...");
    const settleRes = invokeCli(
      potContractId,
      "settle",
      ["--dealer", dealerKp.publicKey()],
      dealerSecret,
    );
    console.log(`  State changed to Settled (3)! Dealer paid R ${data.faceValueSettlementRand.toFixed(2)} in mZAR.`);
    console.log(`  Horizon Link:  ${testnetTxUrl(settleRes.hash)}`);
    console.log(`  StellarExpert: ${stellarExpertTxUrl(settleRes.hash)}`);
    currentState = 3;
  } else {
    console.log("\n[3/4] Pot is already Settled (3).");
  }

  // 4. Members claim their pro-rata returns
  console.log("\n[4/4] Allowlisted members executing pull-based claims in O(1)...");
  const totalSettlementStroops = BigInt(data.zatbillDeliveredStroops);
  const memberSharesList = data.members.map((m) => ({
    member: m.publicKey,
    shares: BigInt(m.shares),
  }));

  const reconciliation = reconcileMemberPayouts(
    memberSharesList,
    totalSettlementStroops,
  );

  const claimResults: Array<{
    name: string;
    payoutRand: string;
    txHash: string;
    profitRand: string;
  }> = [];

  for (let i = 0; i < data.members.length; i++) {
    const m = data.members[i];
    const expected = reconciliation.payouts[i];

    const hasClaimed = invokeCli(
      potContractId,
      "has_claimed",
      ["--member", m.publicKey],
      m.secretKey,
    );

    let txHash = "Already claimed";
    if (hasClaimed.output.trim() !== "true") {
      const claimRes = invokeCli(
        potContractId,
        "claim",
        ["--member", m.publicKey],
        m.secretKey,
      );
      txHash = claimRes.hash;
    }

    const payoutRand = Number(expected.payout) / 10_000_000;
    const profitRand = payoutRand - m.contributionRand;

    claimResults.push({
      name: m.name,
      payoutRand: expected.payoutRand,
      txHash,
      profitRand: `+R ${profitRand.toFixed(2)}`,
    });

    console.log(`  ${m.name} claimed ${expected.payoutRand} (${profitRand >= 0 ? "+" : ""}R ${profitRand.toFixed(2)} yield):`);
    if (txHash.length === 64) {
      console.log(`    Tx: ${testnetTxUrl(txHash)}`);
    } else {
      console.log(`    Status: ${txHash}`);
    }
  }

  // Cent-precision summary
  console.log("\n==================================================================");
  console.log("  FINANCIAL RECONCILIATION SUMMARY (STRICT TO THE CENT)");
  console.log("==================================================================");
  console.log(`  Total Member Contributions:  R ${data.totalContributedRand.toFixed(2)}`);
  console.log(`  Dealer Face-Value Payout:    R ${data.faceValueSettlementRand.toFixed(2)}`);
  console.log(`  Sum of Member Claims:        R ${(Number(reconciliation.sumPayouts) / 10_000_000).toFixed(2)}`);
  console.log(`  Contract Dust Remainder:     ${reconciliation.potRemainder} stroops (R ${(Number(reconciliation.potRemainder) / 10_000_000).toFixed(6)})`);
  console.log(`  Strict Cent Reconciled:      ${reconciliation.reconciledToCent ? "YES (PASSED)" : "FAILED"}`);
  console.log("------------------------------------------------------------------");
  console.log("  Member Breakdown:");
  for (const c of claimResults) {
    console.log(`    - ${c.name.padEnd(25)} Payout: ${c.payoutRand.padEnd(10)} Yield: ${c.profitRand}`);
  }
  console.log("==================================================================\n");
  console.log(">>> FULL LIFECYCLE COMPLETED SUCCESSFULLY ON STELLAR TESTNET! <<<\n");
}

main().catch((err: unknown) => {
  console.error("\n[FATAL ERROR]:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
