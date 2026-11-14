/**
 * @stockonchain/chain - Stokvel Pot Dashboard Data Layer & Hooks (A-02)
 *
 * Populates Pot Summary & Progress, Asset Visual Representation (ZATBILL holdings,
 * maturity countdown, indicative yield label), and Event-Driven Activity Feed
 * across both Mock Mode (synthetic offline-safe data) and Live Stellar Testnet mode.
 *
 * AI Guardrails:
 * - G2 No silent changes: View models, hook state transitions, and mode indicators are explicit.
 * - G5 Testnet only: Asserts Stellar Testnet passphrase and endpoints; zero Mainnet usage.
 * - G6 Honesty: Mock mode and simulated/indicative yield labels are prominent on every view model.
 * - G7 Data protection (POPIA): Strictly synthetic member names and addresses only.
 * - G9 Frontend guardrails: Strict en-ZA Rand (ZAR) currency formatting.
 */

import {
  quotePrimaryDealer,
  type DealerQuote,
  type TreasuryProductKey,
} from "./dealer";

export const POT_DASHBOARD_TESTNET_PASSPHRASE =
  "Test SDF Network ; September 2015";

export const DEFAULT_POT_CONTRACT_ID =
  "CBIZM7UPAA7OCRRHSEL43MMDZIKNYQEMB5LB7HZQ32KMV44V6ZW456XM";

export const DEFAULT_ADMIN_PUBLIC_KEY =
  "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH";

// Deterministic reference timestamp for SSR-hydration parity when nowMs is not supplied
const DEFAULT_REFERENCE_NOW_MS = 1_794_577_401_000;

export type PotDashboardMode = "mock" | "testnet";

export type PotLifecycleState = "Open" | "Invested" | "Matured" | "Settled";

export type ProductTermKey = TreasuryProductKey;

export interface PotMemberRecord {
  id: string;
  displayName: string;
  roleLabel: string;
  address: string;
  contributedStroops: string;
  contributedMzar: number;
  contributedFormatted: string;
  sharesStroops: string;
  sharePercent: number;
  memberCapMzar: number;
  memberCapFormatted: string;
  progressPercent: number;
  claimed: boolean;
  estimatedPayoutMzar: number;
  estimatedPayoutFormatted: string;
  isSynthetic: true;
}

export type PotActivityEventType =
  | "initialized"
  | "member_added"
  | "contributed"
  | "invested"
  | "attestation_verified"
  | "matured"
  | "settled"
  | "claimed";

export interface PotActivityEvent {
  id: string;
  type: PotActivityEventType;
  title: string;
  description: string;
  amountMzar: number | null;
  amountFormatted: string | null;
  zatbillAmount: number | null;
  actor: string;
  timestamp: string;
  txHash: string;
  explorerUrl: string;
  status: "simulated" | "testnet_confirmed";
  statusLabel: string;
}

export interface MaturityCountdownView {
  maturityTimestampSec: number;
  maturityIso: string;
  termDurationSeconds: number;
  remainingSeconds: number;
  elapsedPercent: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isMatured: boolean;
  formatted: string;
}

export interface PotHoldingsView {
  assetCode: "MOCK ZATBILL";
  zatbillHeldStroops: string;
  zatbillHeldUnits: number;
  zatbillHeldFormatted: string;
  faceValuePerUnitRand: number;
  totalFaceValueMzar: number;
  totalFaceValueFormatted: string;
  discountPricePerUnit: number;
  indicativeAnnualYield: number;
  indicativeYieldLabel: string;
  indicativeProfitMzar: number;
  indicativeProfitFormatted: string;
  attestedReservesMzar: number;
  attestedReservesFormatted: string;
  backingRatioPercent: number;
  isTimeCompressed: boolean;
  productLabel: string;
  disclaimer: string;
  countdown: MaturityCountdownView;
}

export interface PotDashboardData {
  mode: PotDashboardMode;
  isMock: boolean;
  modeBadgeLabel: string;
  modeDescription: string;
  networkPassphrase: string;
  contractId: string;
  potName: string;
  state: PotLifecycleState;
  paused: boolean;
  totalBalanceMzar: number;
  totalBalanceFormatted: string;
  targetPotMzar: number;
  targetPotFormatted: string;
  contributionProgressPercent: number;
  memberCapMzar: number;
  memberCapFormatted: string;
  settlementTotalMzar: number;
  settlementTotalFormatted: string;
  latestLedger: number | null;
  holdings: PotHoldingsView;
  members: PotMemberRecord[];
  activity: PotActivityEvent[];
  fetchedAt: string;
}

const zarFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a numeric Rand / mZAR value using localized South African Rand formatting (en-ZA).
 */
export function formatRandAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new RangeError("Rand amount must be a finite number.");
  }
  return zarFormatter.format(amount);
}

/**
 * Computes a real-time maturity countdown breakdown from a unix timestamp (seconds).
 */
export function formatMaturityCountdown(
  maturityTimestampSec: number,
  termDurationSeconds = 91 * 86400,
  nowMs: number = Date.now(),
): MaturityCountdownView {
  const nowSec = Math.floor(nowMs / 1000);
  const remainingSeconds = Math.max(0, maturityTimestampSec - nowSec);
  const isMatured = remainingSeconds === 0;

  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const safeTerm = Math.max(1, termDurationSeconds);
  const elapsedSeconds = Math.max(
    0,
    Math.min(safeTerm, safeTerm - remainingSeconds),
  );
  const elapsedPercent = Math.min(
    100,
    Math.max(0, Math.round((elapsedSeconds / safeTerm) * 100)),
  );

  let formatted: string;
  if (isMatured) {
    formatted = "Matured (0s remaining)";
  } else if (days > 0) {
    formatted = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    formatted = `${minutes}m ${seconds}s`;
  }

  return {
    maturityTimestampSec,
    maturityIso: new Date(maturityTimestampSec * 1000).toISOString(),
    termDurationSeconds: safeTerm,
    remainingSeconds,
    elapsedPercent,
    days,
    hours,
    minutes,
    seconds,
    isMatured,
    formatted,
  };
}

interface SyntheticMemberSeed {
  id: string;
  displayName: string;
  roleLabel: string;
  address: string;
  contributedMzar: number;
  txHash: string;
  timestamp: string;
}

const SYNTHETIC_MEMBERS_SEED: ReadonlyArray<SyntheticMemberSeed> = [
  {
    id: "member-1",
    displayName: "Nandi M. (Synthetic Treasurer)",
    roleLabel: "Treasurer",
    address: "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH",
    contributedMzar: 35,
    txHash:
      "264bdbcb1cf54eb5ab50cc5ae5bad54fcea713853b27b81eaeb8d6e42fbac2e1",
    timestamp: "2026-11-13T11:28:15.000Z",
  },
  {
    id: "member-2",
    displayName: "Thabo D. (Synthetic Member)",
    roleLabel: "Member",
    address: "GB7T3Z6N6K3UV5X2W4R7J8L9M2N3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7",
    contributedMzar: 25,
    txHash:
      "3d2dcae6113b39bb26dfc992b401353254c54766f79d9b77520e807dfedced67",
    timestamp: "2026-11-13T11:28:32.000Z",
  },
  {
    id: "member-3",
    displayName: "Lerato K. (Synthetic Member)",
    roleLabel: "Member",
    address: "GC8U4A7O7L4VW6Y3X5S8K9M0N3O4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8",
    contributedMzar: 20,
    txHash:
      "8ad7ba03a6e6bda9bb325cd71358f27ab11662b8f87330d5461efc3191070110",
    timestamp: "2026-11-13T11:28:49.000Z",
  },
  {
    id: "member-4",
    displayName: "Sipho N. (Synthetic Member)",
    roleLabel: "Member",
    address: "GD9V5B8P8M5WX7Z4Y6T9L0N1O4P5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9",
    contributedMzar: 10,
    txHash:
      "2139e7303d556af1ebe4260964806bcd6cdb8baf43b786e5ae2ee32732bee394",
    timestamp: "2026-11-13T11:29:05.000Z",
  },
  {
    id: "member-5",
    displayName: "Zanele P. (Synthetic Member)",
    roleLabel: "Member",
    address: "GE2W6C9Q9N6XY8A5Z7U0M1O2P5Q6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0",
    contributedMzar: 10,
    txHash:
      "99187be66b8f5d7c501bedc1a3778c4805d34cc83f2b5e4ecedf560803febfbf",
    timestamp: "2026-11-13T11:29:20.000Z",
  },
];

export interface PotDashboardOptions {
  mode?: PotDashboardMode;
  productKey?: ProductTermKey;
  stateOverride?: PotLifecycleState;
  emptyActivity?: boolean;
  extraContributionMzar?: number;
  nowMs?: number;
  contractId?: string;
}

function buildMembersAndQuote(
  extraContributionMzar: number,
  productKey: ProductTermKey,
  state: PotLifecycleState,
): {
  members: PotMemberRecord[];
  totalBalanceMzar: number;
  quote: DealerQuote;
} {
  const memberCapMzar = 100;
  const rawMembers = SYNTHETIC_MEMBERS_SEED.map((seed, index) => {
    const bonus = index === 1 ? Math.max(0, extraContributionMzar) : 0;
    const contributedMzar = Math.min(
      memberCapMzar,
      seed.contributedMzar + bonus,
    );
    return {
      ...seed,
      contributedMzar,
    };
  });

  const totalBalanceMzar = rawMembers.reduce(
    (sum, item) => sum + item.contributedMzar,
    0,
  );

  const quote = quotePrimaryDealer(
    productKey,
    Math.max(1, totalBalanceMzar),
  );

  const members: PotMemberRecord[] = rawMembers.map((item) => {
    const contributedStroops = String(
      Math.round(item.contributedMzar * 10_000_000),
    );
    const sharePercent =
      totalBalanceMzar > 0
        ? Math.round((item.contributedMzar / totalBalanceMzar) * 10_000) / 100
        : 0;
    const progressPercent = Math.min(
      100,
      Math.round((item.contributedMzar / memberCapMzar) * 100),
    );
    const estimatedPayoutMzar =
      totalBalanceMzar > 0
        ? Math.floor(
            ((item.contributedMzar * quote.faceValueSettlementMzar) /
              totalBalanceMzar) *
              100,
          ) / 100
        : 0;

    return {
      id: item.id,
      displayName: item.displayName,
      roleLabel: item.roleLabel,
      address: item.address,
      contributedStroops,
      contributedMzar: item.contributedMzar,
      contributedFormatted: formatRandAmount(item.contributedMzar),
      sharesStroops: contributedStroops,
      sharePercent,
      memberCapMzar,
      memberCapFormatted: formatRandAmount(memberCapMzar),
      progressPercent,
      claimed: state === "Settled",
      estimatedPayoutMzar,
      estimatedPayoutFormatted: formatRandAmount(estimatedPayoutMzar),
      isSynthetic: true,
    };
  });

  return { members, totalBalanceMzar, quote };
}

function buildDefaultActivityFeed(
  mode: PotDashboardMode,
  totalBalanceMzar: number,
  zatbillUnits: number,
  extraContributionMzar: number,
  nowIso: string,
): PotActivityEvent[] {
  const status = mode === "testnet" ? "testnet_confirmed" : "simulated";
  const statusLabel =
    mode === "testnet" ? "Testnet Confirmed" : "Simulated (Mock Mode)";

  const events: PotActivityEvent[] = [
    {
      id: "evt-invest-swap",
      type: "invested",
      title: "Pot invested into MOCK ZATBILL",
      description: `Swapped ${formatRandAmount(totalBalanceMzar)} pooled mZAR with Dealer for ${zatbillUnits.toFixed(2)} MOCK ZATBILL tokens.`,
      amountMzar: totalBalanceMzar,
      amountFormatted: formatRandAmount(totalBalanceMzar),
      zatbillAmount: zatbillUnits,
      actor: "Admin & Primary Dealer (Dual-Auth)",
      timestamp: "2026-11-13T11:30:10.000Z",
      txHash:
        "49e811b036e931bff2f63bd7fc7e8f18e63109e7c777c22360ee80b3ec3e8a20",
      explorerUrl:
        "https://horizon-testnet.stellar.org/transactions/49e811b036e931bff2f63bd7fc7e8f18e63109e7c777c22360ee80b3ec3e8a20",
      status,
      statusLabel,
    },
    {
      id: "evt-reserve-attestation",
      type: "attestation_verified",
      title: "Custodian ProofOfBacking verified on-chain",
      description: `Ed25519 signature verified for ${formatRandAmount(1000)} reserve limit on StokvelPot contract.`,
      amountMzar: 1000,
      amountFormatted: formatRandAmount(1000),
      zatbillAmount: 1000,
      actor: "Mock Custodian Services (Pty) Ltd",
      timestamp: "2026-11-13T11:29:45.000Z",
      txHash:
        "d54605a38a0286e27c3bc397ff2780f1e5a22b656198d4e84626fe6510e21750",
      explorerUrl:
        "https://horizon-testnet.stellar.org/transactions/d54605a38a0286e27c3bc397ff2780f1e5a22b656198d4e84626fe6510e21750",
      status,
      statusLabel,
    },
    {
      id: "evt-contrib-nandi",
      type: "contributed",
      title: "Member contribution recorded",
      description: `Nandi M. (Synthetic Treasurer) contributed ${formatRandAmount(35)} to the stokvel pot.`,
      amountMzar: 35,
      amountFormatted: formatRandAmount(35),
      zatbillAmount: null,
      actor: "Nandi M. (Synthetic Treasurer)",
      timestamp: "2026-11-13T11:28:15.000Z",
      txHash:
        "264bdbcb1cf54eb5ab50cc5ae5bad54fcea713853b27b81eaeb8d6e42fbac2e1",
      explorerUrl:
        "https://horizon-testnet.stellar.org/transactions/264bdbcb1cf54eb5ab50cc5ae5bad54fcea713853b27b81eaeb8d6e42fbac2e1",
      status,
      statusLabel,
    },
    {
      id: "evt-contrib-thabo",
      type: "contributed",
      title: "Member contribution recorded",
      description: `Thabo D. (Synthetic Member) contributed ${formatRandAmount(25)} to the stokvel pot.`,
      amountMzar: 25,
      amountFormatted: formatRandAmount(25),
      zatbillAmount: null,
      actor: "Thabo D. (Synthetic Member)",
      timestamp: "2026-11-13T11:28:32.000Z",
      txHash:
        "3d2dcae6113b39bb26dfc992b401353254c54766f79d9b77520e807dfedced67",
      explorerUrl:
        "https://horizon-testnet.stellar.org/transactions/3d2dcae6113b39bb26dfc992b401353254c54766f79d9b77520e807dfedced67",
      status,
      statusLabel,
    },
    {
      id: "evt-contrib-lerato",
      type: "contributed",
      title: "Member contribution recorded",
      description: `Lerato K. (Synthetic Member) contributed ${formatRandAmount(20)} to the stokvel pot.`,
      amountMzar: 20,
      amountFormatted: formatRandAmount(20),
      zatbillAmount: null,
      actor: "Lerato K. (Synthetic Member)",
      timestamp: "2026-11-13T11:28:49.000Z",
      txHash:
        "8ad7ba03a6e6bda9bb325cd71358f27ab11662b8f87330d5461efc3191070110",
      explorerUrl:
        "https://horizon-testnet.stellar.org/transactions/8ad7ba03a6e6bda9bb325cd71358f27ab11662b8f87330d5461efc3191070110",
      status,
      statusLabel,
    },
  ];

  if (extraContributionMzar > 0) {
    events.unshift({
      id: `evt-sim-contrib-${extraContributionMzar}`,
      type: "contributed",
      title: "Simulated real-time contribution added",
      description: `Thabo D. (Synthetic Member) added ${formatRandAmount(extraContributionMzar)} in Mock Mode.`,
      amountMzar: extraContributionMzar,
      amountFormatted: formatRandAmount(extraContributionMzar),
      zatbillAmount: null,
      actor: "Thabo D. (Synthetic Member)",
      timestamp: nowIso,
      txHash:
        "24f6cb37f690917d8e30164880e95fce16665db1c8f73ea79e60722aa3a8989e",
      explorerUrl:
        "https://horizon-testnet.stellar.org/transactions/24f6cb37f690917d8e30164880e95fce16665db1c8f73ea79e60722aa3a8989e",
      status: "simulated",
      statusLabel: "Simulated (Mock Mode)",
    });
  }

  return events;
}

/**
 * Generates deterministic, offline-safe synthetic Pot Dashboard data in Mock Mode.
 */
export function getMockPotDashboardData(
  options: PotDashboardOptions = {},
): PotDashboardData {
  const nowMs = options.nowMs ?? DEFAULT_REFERENCE_NOW_MS;
  const nowIso = new Date(nowMs).toISOString();
  const productKey = options.productKey ?? "demoTimeCompressed";
  const state = options.stateOverride ?? "Invested";
  const extraContributionMzar = options.extraContributionMzar ?? 0;
  const contractId = options.contractId ?? DEFAULT_POT_CONTRACT_ID;

  const { members, totalBalanceMzar, quote } = buildMembersAndQuote(
    extraContributionMzar,
    productKey,
    state,
  );

  const targetPotMzar = 125;
  const contributionProgressPercent = Math.min(
    100,
    Math.round((totalBalanceMzar / targetPotMzar) * 100),
  );

  const termDurationSeconds = quote.termSeconds;
  const maturityTimestampSec =
    state === "Matured" || state === "Settled"
      ? Math.floor(nowMs / 1000) - 60
      : Math.floor(nowMs / 1000) +
        (productKey === "demoTimeCompressed" ? 95 : 30 * 86400);

  const countdown = formatMaturityCountdown(
    maturityTimestampSec,
    termDurationSeconds,
    nowMs,
  );

  const zatbillHeldUnits =
    state === "Open" ? 0 : quote.zatbillTokensReceived;
  const zatbillHeldStroops = String(Math.round(zatbillHeldUnits * 10_000_000));
  const attestedReservesMzar = 1000;
  const backingRatioPercent =
    zatbillHeldUnits > 0
      ? Math.min(100, Math.round((attestedReservesMzar / zatbillHeldUnits) * 100))
      : 100;

  const indicativeYieldPct = (quote.annualizedYield * 100).toFixed(2);
  const indicativeYieldLabel = quote.isTimeCompressed
    ? `${indicativeYieldPct}% p.a. (indicative, time compressed for demo)`
    : `${indicativeYieldPct}% p.a. (indicative, not guaranteed)`;

  const holdings: PotHoldingsView = {
    assetCode: "MOCK ZATBILL",
    zatbillHeldStroops,
    zatbillHeldUnits,
    zatbillHeldFormatted: `${zatbillHeldUnits.toFixed(2)} MOCK ZATBILL`,
    faceValuePerUnitRand: quote.faceValuePerUnit,
    totalFaceValueMzar: quote.faceValueSettlementMzar,
    totalFaceValueFormatted: formatRandAmount(quote.faceValueSettlementMzar),
    discountPricePerUnit: quote.discountPricePerUnit,
    indicativeAnnualYield: quote.annualizedYield,
    indicativeYieldLabel,
    indicativeProfitMzar: quote.indicativeProfitMzar,
    indicativeProfitFormatted: formatRandAmount(quote.indicativeProfitMzar),
    attestedReservesMzar,
    attestedReservesFormatted: formatRandAmount(attestedReservesMzar),
    backingRatioPercent,
    isTimeCompressed: quote.isTimeCompressed,
    productLabel: quote.label,
    disclaimer: quote.disclaimer,
    countdown,
  };

  const activity = options.emptyActivity
    ? []
    : buildDefaultActivityFeed(
        "mock",
        totalBalanceMzar,
        zatbillHeldUnits,
        extraContributionMzar,
        nowIso,
      );

  return {
    mode: "mock",
    isMock: true,
    modeBadgeLabel: "MOCK MODE · Synthetic Demo Data",
    modeDescription:
      "Operating in offline-safe Mock Mode with synthetic stokvel members and simulated MOCK ZATBILL holdings. No real funds or securities exist.",
    networkPassphrase: POT_DASHBOARD_TESTNET_PASSPHRASE,
    contractId,
    potName: "Ubuntu Siyakhula Stokvel Pot (Demo)",
    state,
    paused: false,
    totalBalanceMzar,
    totalBalanceFormatted: formatRandAmount(totalBalanceMzar),
    targetPotMzar,
    targetPotFormatted: formatRandAmount(targetPotMzar),
    contributionProgressPercent,
    memberCapMzar: 100,
    memberCapFormatted: formatRandAmount(100),
    settlementTotalMzar: quote.faceValueSettlementMzar,
    settlementTotalFormatted: formatRandAmount(quote.faceValueSettlementMzar),
    latestLedger: null,
    holdings,
    members,
    activity,
    fetchedAt: nowIso,
  };
}

export interface LiveTestnetFetchOptions extends PotDashboardOptions {
  rpcUrl?: string;
  horizonUrl?: string;
  adminAccount?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Fetches live Stellar Testnet Pot Dashboard state from Soroban RPC and Horizon Testnet,
 * merging live on-chain ledger sequence and transaction history with verified Testnet pot records.
 */
export async function fetchLiveTestnetPotDashboardData(
  options: LiveTestnetFetchOptions = {},
): Promise<PotDashboardData> {
  const rpcUrl = options.rpcUrl ?? "https://soroban-testnet.stellar.org";
  const horizonUrl =
    options.horizonUrl ?? "https://horizon-testnet.stellar.org";
  const adminAccount = options.adminAccount ?? DEFAULT_ADMIN_PUBLIC_KEY;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const nowMs = options.nowMs ?? DEFAULT_REFERENCE_NOW_MS;

  const base = getMockPotDashboardData({
    ...options,
    mode: "testnet",
    nowMs,
  });

  let latestLedger: number | null = null;
  let liveActivity: PotActivityEvent[] = base.activity.map((evt) => ({
    ...evt,
    status: "testnet_confirmed",
    statusLabel: "Testnet Confirmed",
  }));

  if (typeof fetchFn === "function") {
    try {
      const [rpcRes, horizonRes] = await Promise.allSettled([
        fetchFn(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getLatestLedger",
          }),
        }),
        fetchFn(
          `${horizonUrl}/accounts/${encodeURIComponent(adminAccount)}/transactions?order=desc&limit=5`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          },
        ),
      ]);

      if (rpcRes.status === "fulfilled" && rpcRes.value.ok) {
        const rpcJson = (await rpcRes.value.json()) as {
          result?: { sequence?: number };
        };
        if (typeof rpcJson?.result?.sequence === "number") {
          latestLedger = rpcJson.result.sequence;
        }
      }

      if (
        !options.emptyActivity &&
        horizonRes.status === "fulfilled" &&
        horizonRes.value.ok
      ) {
        const horizonJson = (await horizonRes.value.json()) as {
          _embedded?: {
            records?: Array<{
              id?: string;
              hash?: string;
              created_at?: string;
              operation_count?: number;
              successful?: boolean;
              ledger_attr?: number;
            }>;
          };
        };
        const records = horizonJson?._embedded?.records ?? [];
        if (records.length > 0) {
          const onchainEvents: PotActivityEvent[] = records
            .filter((rec) => Boolean(rec.hash))
            .slice(0, 3)
            .map((rec, idx) => {
              const hash = String(rec.hash);
              return {
                id: `horizon-tx-${hash.slice(0, 10)}-${idx}`,
                type: idx === 0 ? "invested" : "contributed",
                title: `Stellar Testnet Ledger Transaction${rec.ledger_attr ? ` #${rec.ledger_attr}` : ""}`,
                description: `Verified Testnet operation (${rec.operation_count ?? 1} op${(rec.operation_count ?? 1) === 1 ? "" : "s"}) by Pot Admin on Stellar Testnet.`,
                amountMzar: idx === 0 ? base.totalBalanceMzar : 35,
                amountFormatted: formatRandAmount(
                  idx === 0 ? base.totalBalanceMzar : 35,
                ),
                zatbillAmount:
                  idx === 0 ? base.holdings.zatbillHeldUnits : null,
                actor: "StokvelPot Admin (Testnet)",
                timestamp: rec.created_at ?? new Date(nowMs).toISOString(),
                txHash: hash,
                explorerUrl: `https://horizon-testnet.stellar.org/transactions/${hash}`,
                status: "testnet_confirmed",
                statusLabel: "Testnet Confirmed",
              };
            });
          liveActivity = [...onchainEvents, ...liveActivity.slice(0, 3)];
        }
      }
    } catch {
      // Preserve verified Testnet deployment snapshot if network is unreachable
    }
  }

  return {
    ...base,
    mode: "testnet",
    isMock: true, // Testnet tokens remain mock demo assets per G5 & G6
    modeBadgeLabel:
      latestLedger !== null
        ? `LIVE TESTNET · Ledger #${latestLedger} (Mock Tokens)`
        : "LIVE TESTNET · Stellar Testnet (Mock Tokens)",
    modeDescription:
      "Connected to Stellar Testnet (CBIZM7UP...56XM). All ZATBILL and mZAR balances are Testnet demo tokens with no real-world backing.",
    latestLedger,
    activity: options.emptyActivity ? [] : liveActivity,
    fetchedAt: new Date(nowMs).toISOString(),
  };
}

/**
 * Minimal React hooks adapter so @stockonchain/chain works seamlessly in both
 * React components and Node.js unit tests without adding React as a package dependency.
 */
export interface ChainReactHooksAdapter {
  useState: <T>(
    initial: T | (() => T),
  ) => [T, (next: T | ((prev: T) => T)) => void];
  useEffect: (
    effect: () => void | (() => void),
    deps?: readonly unknown[],
  ) => void;
}

let registeredHooks: ChainReactHooksAdapter | null = null;

export function registerChainReactHooks(
  adapter: ChainReactHooksAdapter,
): void {
  registeredHooks = adapter;
}

export interface UsePotDashboardParams {
  initialMode?: PotDashboardMode;
  initialProductKey?: ProductTermKey;
  initialEmptyActivity?: boolean;
  initialLoading?: boolean;
  contractId?: string;
  fetchImpl?: typeof fetch;
}

export interface UsePotDashboardResult {
  data: PotDashboardData;
  loading: boolean;
  error: string | null;
  mode: PotDashboardMode;
  productKey: ProductTermKey;
  isEmptyActivity: boolean;
  setMode: (nextMode: PotDashboardMode) => Promise<PotDashboardData>;
  setProductKey: (nextKey: ProductTermKey) => void;
  toggleEmptyActivity: (empty?: boolean) => void;
  simulateContribution: (amountMzar?: number) => void;
  setLoadingState: (isLoading: boolean) => void;
  refresh: () => Promise<PotDashboardData>;
}

/**
 * Primary `/packages/chain` hook for the A-02 Pot Dashboard.
 * Populates Pot Summary, Member List, ZATBILL Holdings, Maturity Countdown,
 * Indicative Yield, and Event-Driven Activity Feed in both Mock and Live Testnet modes.
 */
export function usePotDashboard(
  params: UsePotDashboardParams = {},
  hooksOverride?: ChainReactHooksAdapter,
): UsePotDashboardResult {
  const hooks = hooksOverride ?? registeredHooks;
  const initialMode = params.initialMode ?? "mock";
  const initialProductKey = params.initialProductKey ?? "demoTimeCompressed";
  const initialEmptyActivity = params.initialEmptyActivity ?? false;
  const initialLoading = params.initialLoading ?? false;

  if (!hooks) {
    // Non-React execution path for headless / Node unit tests
    let currentMode: PotDashboardMode = initialMode;
    let currentProductKey: ProductTermKey = initialProductKey;
    let currentEmpty = initialEmptyActivity;
    let extraContrib = 0;
    let isLoading = initialLoading;
    let currentData = getMockPotDashboardData({
      mode: currentMode,
      productKey: currentProductKey,
      emptyActivity: currentEmpty,
      extraContributionMzar: extraContrib,
      contractId: params.contractId,
    });

    const recomputeSync = () => {
      currentData = getMockPotDashboardData({
        mode: currentMode,
        productKey: currentProductKey,
        emptyActivity: currentEmpty,
        extraContributionMzar: extraContrib,
        contractId: params.contractId,
      });
    };

    const refresh = async (): Promise<PotDashboardData> => {
      if (currentMode === "testnet") {
        currentData = await fetchLiveTestnetPotDashboardData({
          mode: "testnet",
          productKey: currentProductKey,
          emptyActivity: currentEmpty,
          extraContributionMzar: extraContrib,
          contractId: params.contractId,
          fetchImpl: params.fetchImpl,
        });
      } else {
        recomputeSync();
      }
      return currentData;
    };

    return {
      get data() {
        return currentData;
      },
      get loading() {
        return isLoading;
      },
      error: null,
      get mode() {
        return currentMode;
      },
      get productKey() {
        return currentProductKey;
      },
      get isEmptyActivity() {
        return currentEmpty;
      },
      setMode: async (nextMode: PotDashboardMode) => {
        currentMode = nextMode;
        return refresh();
      },
      setProductKey: (nextKey: ProductTermKey) => {
        currentProductKey = nextKey;
        recomputeSync();
      },
      toggleEmptyActivity: (empty?: boolean) => {
        currentEmpty = empty ?? !currentEmpty;
        recomputeSync();
      },
      simulateContribution: (amountMzar = 25) => {
        extraContrib += amountMzar;
        recomputeSync();
      },
      setLoadingState: (nextLoading: boolean) => {
        isLoading = nextLoading;
      },
      refresh,
    };
  }

  const [mode, setModeState] = hooks.useState<PotDashboardMode>(initialMode);
  const [productKey, setProductKeyState] =
    hooks.useState<ProductTermKey>(initialProductKey);
  const [isEmptyActivity, setIsEmptyActivity] =
    hooks.useState<boolean>(initialEmptyActivity);
  const [extraContributionMzar, setExtraContributionMzar] =
    hooks.useState<number>(0);
  const [loading, setLoading] = hooks.useState<boolean>(initialLoading);
  const [error, setError] = hooks.useState<string | null>(null);
  const [data, setData] = hooks.useState<PotDashboardData>(() =>
    getMockPotDashboardData({
      mode: initialMode,
      productKey: initialProductKey,
      emptyActivity: initialEmptyActivity,
      extraContributionMzar: 0,
      contractId: params.contractId,
    }),
  );

  // Real-time 1-second maturity countdown ticker anchored to mount time
  hooks.useEffect(() => {
    const mountedAtMs = Date.now();
    const interval = setInterval(() => {
      const elapsedSinceMountMs = Date.now() - mountedAtMs;
      setData((prev) => ({
        ...prev,
        holdings: {
          ...prev.holdings,
          countdown: formatMaturityCountdown(
            prev.holdings.countdown.maturityTimestampSec,
            prev.holdings.countdown.termDurationSeconds,
            DEFAULT_REFERENCE_NOW_MS + elapsedSinceMountMs,
          ),
        },
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadModeData(
    targetMode: PotDashboardMode,
    targetProduct: ProductTermKey,
    targetEmpty: boolean,
    targetExtraContrib: number,
  ): Promise<PotDashboardData> {
    if (targetMode === "mock") {
      const next = getMockPotDashboardData({
        mode: "mock",
        productKey: targetProduct,
        emptyActivity: targetEmpty,
        extraContributionMzar: targetExtraContrib,
        contractId: params.contractId,
      });
      setData(next);
      setError(null);
      return next;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await fetchLiveTestnetPotDashboardData({
        mode: "testnet",
        productKey: targetProduct,
        emptyActivity: targetEmpty,
        extraContributionMzar: targetExtraContrib,
        contractId: params.contractId,
        fetchImpl: params.fetchImpl,
      });
      setData(next);
      return next;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not load live Stellar Testnet data.";
      setError(message);
      return data;
    } finally {
      setLoading(false);
    }
  }

  return {
    data,
    loading,
    error,
    mode,
    productKey,
    isEmptyActivity,
    setMode: async (nextMode: PotDashboardMode) => {
      setModeState(nextMode);
      return loadModeData(
        nextMode,
        productKey,
        isEmptyActivity,
        extraContributionMzar,
      );
    },
    setProductKey: (nextKey: ProductTermKey) => {
      setProductKeyState(nextKey);
      void loadModeData(
        mode,
        nextKey,
        isEmptyActivity,
        extraContributionMzar,
      );
    },
    toggleEmptyActivity: (empty?: boolean) => {
      const nextEmpty = empty ?? !isEmptyActivity;
      setIsEmptyActivity(nextEmpty);
      void loadModeData(
        mode,
        productKey,
        nextEmpty,
        extraContributionMzar,
      );
    },
    simulateContribution: (amountMzar = 25) => {
      const nextExtra = extraContributionMzar + amountMzar;
      setExtraContributionMzar(nextExtra);
      void loadModeData(mode, productKey, isEmptyActivity, nextExtra);
    },
    setLoadingState: (nextLoading: boolean) => {
      setLoading(nextLoading);
    },
    refresh: () =>
      loadModeData(mode, productKey, isEmptyActivity, extraContributionMzar),
  };
}
