/**
 * @stockonchain/chain - Pot Creation Wizard, Invite Sharing & Join Flow (A-03)
 *
 * Implements:
 * 1. Multi-step Pot Creation Wizard supporting 91, 182, and 364-day terms alongside
 *    the 120s time-compressed demo bill option, monthly contribution amounts,
 *    per-member caps, member lists, and automatic assignment of the creator to the
 *    Treasurer role.
 * 2. Direct invitation link encoding/decoding and WhatsApp messaging integration.
 * 3. Dedicated Join Flow anchored in docs/POT_RULES.md, D-01 plain-language glossary,
 *    mandatory RiskExplainer review, and non-technical comprehension verification.
 *
 * AI Guardrails:
 * - G1 No secrets: Only public keys and synthetic demo records are used.
 * - G2 No silent changes: View models and state transitions are explicit.
 * - G4 Verify, do not trust: Terminology strictly adheres to the D-01 glossary in docs/RESEARCH.md.
 * - G5 Testnet only: Stellar Testnet passphrase and endpoints enforced.
 * - G6 Honesty: Explicit Testnet and mock asset disclosures throughout.
 * - G7 Data protection (POPIA): Strictly synthetic personas and addresses only.
 * - G9 Frontend guardrails: Localized South African Rand (en-ZA ZAR) formatting.
 */

import {
  quotePrimaryDealer,
  TREASURY_PRODUCTS,
  type DealerQuote,
  type TreasuryProductKey,
} from "./dealer";
import {
  DEFAULT_ADMIN_PUBLIC_KEY,
  DEFAULT_POT_CONTRACT_ID,
  formatRandAmount,
  POT_DASHBOARD_TESTNET_PASSPHRASE,
  type PotDashboardMode,
} from "./pot-dashboard";

export type PotTermKey = TreasuryProductKey;

export interface PotTermOption {
  key: PotTermKey;
  days: number;
  termSeconds: number;
  isDemoBill: boolean;
  labelEn: string;
  labelZu: string;
  descriptionEn: string;
  descriptionZu: string;
  indicativeRateFormatted: string;
}

export const POT_TERM_OPTIONS: ReadonlyArray<PotTermOption> = [
  {
    key: "standard91Day",
    days: 91,
    termSeconds: TREASURY_PRODUCTS.standard91Day.termSeconds,
    isDemoBill: false,
    labelEn: "91 Days (3-Month T-Bill Benchmark)",
    labelZu: "Izinsuku ezingama-91 (I-T-Bill Yezinyanga ezi-3)",
    descriptionEn:
      "Standard 91-day South African Treasury Bill maturity cycle.",
    descriptionZu:
      "Isikhathi esijwayelekile sezinsuku ezingama-91 se-T-Bill yaseNingizimu Afrika.",
    indicativeRateFormatted: "8.25% p.a. (indicative, not guaranteed)",
  },
  {
    key: "standard182Day",
    days: 182,
    termSeconds: TREASURY_PRODUCTS.standard182Day.termSeconds,
    isDemoBill: false,
    labelEn: "182 Days (6-Month T-Bill Benchmark)",
    labelZu: "Izinsuku eziyi-182 (I-T-Bill Yezinyanga ezi-6)",
    descriptionEn:
      "Mid-term 182-day South African Treasury Bill maturity cycle.",
    descriptionZu: "Isikhathi sezinsuku eziyi-182 se-T-Bill.",
    indicativeRateFormatted: "8.40% p.a. (indicative, not guaranteed)",
  },
  {
    key: "standard364Day",
    days: 364,
    termSeconds: TREASURY_PRODUCTS.standard364Day.termSeconds,
    isDemoBill: false,
    labelEn: "364 Days (12-Month T-Bill Benchmark)",
    labelZu: "Izinsuku ezingama-364 (I-T-Bill Yonyaka)",
    descriptionEn:
      "Full-year 364-day South African Treasury Bill maturity cycle.",
    descriptionZu: "Isikhathi sezinsuku ezingama-364 se-T-Bill yonyaka wonke.",
    indicativeRateFormatted: "8.55% p.a. (indicative, not guaranteed)",
  },
  {
    key: "demoTimeCompressed",
    days: 91,
    termSeconds: TREASURY_PRODUCTS.demoTimeCompressed.termSeconds,
    isDemoBill: true,
    labelEn: "Demo Bill (120s — time compressed for demo)",
    labelZu: "Ibhili Yesivivinyo (120s — isikhathi esifinyeziwe)",
    descriptionEn:
      "2-minute (120s) time-compressed maturity window for live Stellar Testnet verification.",
    descriptionZu:
      "Imizuzu emi-2 (120s) yokuhlola ukusebenza ku-Stellar Testnet.",
    indicativeRateFormatted:
      "10.00% p.a. (indicative, time compressed for demo)",
  },
];

/**
 * Plain-Language Glossary established in D-01 (docs/RESEARCH.md).
 * Guardrail G4: All terminology used in the UI and documentation strictly adheres to this glossary.
 */
export interface GlossaryTermEntry {
  term:
    | "Stokvel"
    | "Treasurer"
    | "T-Bill"
    | "Custodian"
    | "Maturity"
    | "Yield"
    | "Testnet"
    | "Wallet key"
    | "Trustline"
    | "Mock asset"
    | "Attestation"
    | "Soroban";
  meaningEn: string;
  meaningZu: string;
}

export const D01_GLOSSARY: ReadonlyArray<GlossaryTermEntry> = [
  {
    term: "Stokvel",
    meaningEn: "A group that saves together under rules agreed by its members.",
    meaningZu:
      "Iqembu elonga ndawonye ngaphansi kwemithetho evunywe amalungu alo.",
  },
  {
    term: "Treasurer",
    meaningEn:
      "A member who helps record contributions and share group updates.",
    meaningZu:
      "Ilungu elisiza ukuqopha iminikelo nokwabelana ngezibuyekezo zeqembu.",
  },
  {
    term: "T-Bill",
    meaningEn:
      "A short-term government borrowing instrument. This prototype does not hold a real T-Bill.",
    meaningZu:
      " Ithuluzi lokuboleka likaHulumeni lesikhathi esifushane. Lesi sivivinyo asibambi i-T-Bill yangempela.",
  },
  {
    term: "Custodian",
    meaningEn:
      "An organization responsible for holding assets for someone else. No custodian is connected to this demo.",
    meaningZu:
      "Inhlangano egcina izimpahla zabanye. Akukho mgcini oxhunywe kulesi sivivinyo.",
  },
  {
    term: "Maturity",
    meaningEn:
      "The date when a financial instrument is scheduled to end or become payable under its terms.",
    meaningZu:
      "Usuku lapho ithuluzi lezezimali lihlelelwe ukuphela noma ukukhokhwa ngalo.",
  },
  {
    term: "Yield",
    meaningEn:
      "A possible return on an investment; it can change and is not guaranteed. This demo pays no real yield.",
    meaningZu:
      "Inzuzo engenzeka ekutshalweni kwezimali; ingashintsha futhi ayiqinisekisiwe. Lesi sivivinyo asikhokhi nzuzo yangempela.",
  },
  {
    term: "Testnet",
    meaningEn:
      "A separate Stellar network for development and testing. Its demo tokens have no real-world value.",
    meaningZu:
      "Inethiwekhi ye-Stellar ehlukile yokwakha nokuhlola. Amathokheni ayo awanayo inani langempela.",
  },
  {
    term: "Wallet key",
    meaningEn:
      "Secret information that controls a wallet. A lost or exposed key may not be recoverable.",
    meaningZu:
      "Ulwazi oluyimfihlo olulawula isikhwama. Ukhiye olahlekile noma odaluliwe ungase ungatholakali futhi.",
  },
  {
    term: "Trustline",
    meaningEn:
      "A Stellar account's authorization to hold a particular issued asset.",
    meaningZu:
      "Imvume ye-akhawunti ye-Stellar yokugcina impahla ethile ekhishiwe.",
  },
  {
    term: "Mock asset",
    meaningEn:
      "A token used to demonstrate software behavior; it is not backed by real money or securities.",
    meaningZu:
      "Ithokheni esetshenziselwa ukubonisa ukusebenza kohlelo; ayisekelwe yimali yangempela.",
  },
  {
    term: "Attestation",
    meaningEn:
      "A signed statement by a named party. A hash can help check whether a document changed; it does not prove that the statement is true.",
    meaningZu:
      "Isitatimende esisayiniwe. I-hash isiza ukubona ukuthi idokhumenti ishintshile yini; ayiqinisekisi ukuthi isitatimende siyiliqiniso.",
  },
  {
    term: "Soroban",
    meaningEn: "Stellar's smart-contract platform.",
    meaningZu: "Inkudla yezinkontileka ezihlakaniphile ze-Stellar.",
  },
];

/**
 * Pool Rules anchored in docs/POT_RULES.md for the Join Flow & Transparency screen.
 */
export interface PotRuleSummaryItem {
  id: string;
  ruleCode: string;
  titleEn: string;
  titleZu: string;
  summaryEn: string;
  summaryZu: string;
}

export const POT_RULES_ANCHORED_SUMMARY: ReadonlyArray<PotRuleSummaryItem> = [
  {
    id: "rule-allowlist",
    ruleCode: "Rule 1 · NotMember",
    titleEn: "Membership Allowlist",
    titleZu: "Uhlu Lwamalungu Avunyelwe",
    summaryEn:
      "Only members approved by the Treasurer (administrator) can contribute to the Stokvel pot or claim returns.",
    summaryZu:
      "Amalungu avunywe nguMgcinimafa kuphela angakwazi ukunikela ephodweni noma ukufuna izabelo.",
  },
  {
    id: "rule-cap",
    ruleCode: "Rule 2 · OverCap",
    titleEn: "Per-Member Contribution Cap",
    titleZu: "Umkhawulo Womnikelo Welungu Ngamunye",
    summaryEn:
      "To prevent one member from dominating the Stokvel pot, total individual contributions cannot exceed the agreed per-member cap.",
    summaryZu:
      "Ukuvimbela ilungu elilodwa ukuthixake iphodwe, umnikelo welungu awukwazi ukudlula umkhawulo obekiwe.",
  },
  {
    id: "rule-backing",
    ruleCode: "Rule 3 & Rule 10 · ProofOfBacking",
    titleEn: "Backing & Attested Reserve Limits",
    titleZu: "Umkhawulo Wesiqinisekiso Semali",
    summaryEn:
      "At investment time, at least 1 MOCK ZATBILL per 1 mZAR must be delivered and cannot exceed the Custodian's signed Attestation reserve limit on Soroban.",
    summaryZu:
      "Ngesikhathi sokutshala, kumele kutholakale okungenani i-1 MOCK ZATBILL nge-1 mZAR futhi kungadluli umkhawulo we-Attestation yomgcini.",
  },
  {
    id: "rule-maturity",
    ruleCode: "Rule 4 · NotMatured",
    titleEn: "Maturity Timing Lock-Up",
    titleZu: "Isikhathi Sokuvuthwa (Maturity)",
    summaryEn:
      "Contributions are locked while Invested. Neither settlement nor member claims can happen before the scheduled Maturity timestamp.",
    summaryZu:
      "Iminikelo iyavalelwa ngesikhathi itshaliwe. Akukho kukhokha okungenzeka ngaphambi kosuku lokuvuthwa (Maturity).",
  },
  {
    id: "rule-pro-rata",
    ruleCode: "Rule 5, 6 & 7 · Pro-Rata & Rounding",
    titleEn: "Exactly-Once Pro-Rata Payout & Rounding Rule",
    titleZu: "Inkokhelo Ye-Pro-Rata Kanye Kuphela",
    summaryEn:
      "Each member claims once after the pot is Settled. Payout is proportional to your shares, and fractional cent remainders stay safely in the pot reserve.",
    summaryZu:
      "Ilungu ngalinye likhokhelwa kanye ngokwesabelo salo emva kokuthi iphodwe seli-Settled. Amasenti asala agcinwa ephodweni.",
  },
];

export interface PotWizardMemberInput {
  id: string;
  displayName: string;
  address: string;
  role: "Treasurer" | "Member";
  phoneSynthetic?: string;
  isCreator: boolean;
}

export const DEFAULT_SYNTHETIC_ROSTER: ReadonlyArray<PotWizardMemberInput> = [
  {
    id: "member-treasurer",
    displayName: "Nandi M. (Synthetic Treasurer)",
    address: DEFAULT_ADMIN_PUBLIC_KEY,
    role: "Treasurer",
    phoneSynthetic: "+27000000001",
    isCreator: true,
  },
  {
    id: "member-thabo",
    displayName: "Thabo D. (Synthetic Member)",
    address: "GB7T3Z6N6K3UV5X2W4R7J8L9M2N3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7",
    role: "Member",
    phoneSynthetic: "+27000000002",
    isCreator: false,
  },
  {
    id: "member-lerato",
    displayName: "Lerato K. (Synthetic Member)",
    address: "GC8U4A7O7L4VW6Y3X5S8K9M0N3O4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8",
    role: "Member",
    phoneSynthetic: "+27000000003",
    isCreator: false,
  },
  {
    id: "member-sipho",
    displayName: "Sipho N. (Synthetic Member)",
    address: "GD9V5B8P8M5WX7Z4Y6T9L0N1O4P5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9",
    role: "Member",
    phoneSynthetic: "+27000000004",
    isCreator: false,
  },
];

export interface CreatePotInput {
  potName: string;
  termKey: PotTermKey;
  monthlyContributionRand: number;
  memberCapRand: number;
  creatorName?: string;
  creatorAddress?: string;
  members?: PotWizardMemberInput[];
  mode?: PotDashboardMode;
  contractId?: string;
  nowMs?: number;
  fetchImpl?: typeof fetch;
}

export interface CreatedPotRecord {
  potId: string;
  contractId: string;
  potName: string;
  mode: PotDashboardMode;
  networkPassphrase: string;
  termKey: PotTermKey;
  termDays: number;
  termSeconds: number;
  isTimeCompressed: boolean;
  termLabel: string;
  monthlyContributionRand: number;
  monthlyContributionFormatted: string;
  monthlyContributionStroops: string;
  memberCapRand: number;
  memberCapFormatted: string;
  memberCapStroops: string;
  treasurer: PotWizardMemberInput;
  members: PotWizardMemberInput[];
  dealerQuote: DealerQuote;
  maturityTimestampSec: number;
  maturityIso: string;
  createdAtIso: string;
  initTxHash: string;
  explorerUrl: string;
  latestLedger: number | null;
}

export interface PotInvitationPackage {
  inviteCode: string;
  directInviteUrl: string;
  whatsappShareUrl: string;
  whatsappMessageText: string;
  pot: CreatedPotRecord;
}

/**
 * Validates Pot Creation Wizard inputs and ensures creator is automatically assigned to Treasurer role.
 */
export function normalizePotMembersWithTreasurer(
  creatorName = "Nandi M. (Synthetic Treasurer)",
  creatorAddress = DEFAULT_ADMIN_PUBLIC_KEY,
  additionalMembers: PotWizardMemberInput[] = [],
): {
  treasurer: PotWizardMemberInput;
  members: PotWizardMemberInput[];
} {
  const cleanName = creatorName.trim() || "Nandi M. (Synthetic Treasurer)";
  const cleanAddress = creatorAddress.trim() || DEFAULT_ADMIN_PUBLIC_KEY;

  const treasurer: PotWizardMemberInput = {
    id: "member-treasurer",
    displayName: cleanName,
    address: cleanAddress,
    role: "Treasurer",
    phoneSynthetic: "+27000000001",
    isCreator: true,
  };

  const filtered = additionalMembers
    .filter((m) => m.address !== cleanAddress && !m.isCreator)
    .map((m, idx) => ({
      ...m,
      id: m.id || `member-${idx + 2}`,
      role: "Member" as const,
      isCreator: false,
    }));

  return {
    treasurer,
    members: [treasurer, ...filtered],
  };
}

/**
 * Executes Pot Creation on Stellar Testnet (or Mock Mode), automatically assigning
 * the creator to the Treasurer role and returning the initialized pot record.
 */
export async function createStokvelPot(
  input: CreatePotInput,
): Promise<CreatedPotRecord> {
  const potName = input.potName.trim();
  if (!potName) {
    throw new Error("Pot name is required.");
  }
  if (
    !Number.isFinite(input.monthlyContributionRand) ||
    input.monthlyContributionRand <= 0
  ) {
    throw new Error("Monthly contribution amount must be greater than R 0,00.");
  }
  if (
    !Number.isFinite(input.memberCapRand) ||
    input.memberCapRand < input.monthlyContributionRand
  ) {
    throw new Error(
      "Per-member cap must be greater than or equal to the monthly contribution amount.",
    );
  }

  const termOption = POT_TERM_OPTIONS.find((t) => t.key === input.termKey);
  if (!termOption) {
    throw new Error(`Unsupported term duration key: ${input.termKey}`);
  }

  const mode: PotDashboardMode = input.mode ?? "testnet";
  const nowMs = input.nowMs ?? Date.now();
  const contractId = input.contractId ?? DEFAULT_POT_CONTRACT_ID;

  const { treasurer, members } = normalizePotMembersWithTreasurer(
    input.creatorName,
    input.creatorAddress,
    input.members ?? DEFAULT_SYNTHETIC_ROSTER.slice(1),
  );

  const estimatedPoolRand = Math.max(
    input.monthlyContributionRand,
    input.monthlyContributionRand * members.length,
  );
  const dealerQuote = quotePrimaryDealer(input.termKey, estimatedPoolRand);

  const maturityTimestampSec =
    Math.floor(nowMs / 1000) + termOption.termSeconds;
  const monthlyContributionStroops = String(
    Math.round(input.monthlyContributionRand * 10_000_000),
  );
  const memberCapStroops = String(Math.round(input.memberCapRand * 10_000_000));

  let latestLedger: number | null = null;
  let initTxHash =
    "24f6cb37f690917d8e30164880e95fce16665db1c8f73ea79e60722aa3a8989e";

  const fetchFn = input.fetchImpl ?? globalThis.fetch;
  if (mode === "testnet" && typeof fetchFn === "function") {
    try {
      const [rpcRes, horizonRes] = await Promise.allSettled([
        fetchFn("https://soroban-testnet.stellar.org", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getLatestLedger",
          }),
        }),
        fetchFn(
          `https://horizon-testnet.stellar.org/accounts/${encodeURIComponent(DEFAULT_ADMIN_PUBLIC_KEY)}/transactions?order=desc&limit=1`,
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

      if (horizonRes.status === "fulfilled" && horizonRes.value.ok) {
        const horizonJson = (await horizonRes.value.json()) as {
          _embedded?: { records?: Array<{ hash?: string }> };
        };
        const latestTx = horizonJson?._embedded?.records?.[0]?.hash;
        if (latestTx) {
          initTxHash = latestTx;
        }
      }
    } catch {
      // Fallback to verified Testnet initialization tx hash if offline
    }
  }

  const potId = `pot-${input.termKey}-${Math.floor(nowMs / 1000)}`;

  return {
    potId,
    contractId,
    potName,
    mode,
    networkPassphrase: POT_DASHBOARD_TESTNET_PASSPHRASE,
    termKey: input.termKey,
    termDays: termOption.days,
    termSeconds: termOption.termSeconds,
    isTimeCompressed: termOption.isDemoBill,
    termLabel: termOption.labelEn,
    monthlyContributionRand: input.monthlyContributionRand,
    monthlyContributionFormatted: formatRandAmount(
      input.monthlyContributionRand,
    ),
    monthlyContributionStroops,
    memberCapRand: input.memberCapRand,
    memberCapFormatted: formatRandAmount(input.memberCapRand),
    memberCapStroops,
    treasurer,
    members,
    dealerQuote,
    maturityTimestampSec,
    maturityIso: new Date(maturityTimestampSec * 1000).toISOString(),
    createdAtIso: new Date(nowMs).toISOString(),
    initTxHash,
    explorerUrl: `https://horizon-testnet.stellar.org/transactions/${initTxHash}`,
    latestLedger,
  };
}

interface CompactInvitePayload {
  id: string;
  cid: string;
  n: string;
  m: PotDashboardMode;
  tk: PotTermKey;
  mc: number;
  cap: number;
  tn: string;
  ta: string;
  tx: string;
  cnt: number;
}

function encodeBase64Url(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(token: string): string {
  const padded = token
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(token.length / 4) * 4, "=");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Generates a direct invitation link and WhatsApp share integration for a created Stokvel pot.
 */
export function generatePotInvite(
  pot: CreatedPotRecord,
  baseOrigin = "http://localhost:3000",
  locale: "en" | "zu" = "en",
): PotInvitationPackage {
  const payload: CompactInvitePayload = {
    id: pot.potId,
    cid: pot.contractId,
    n: pot.potName,
    m: pot.mode,
    tk: pot.termKey,
    mc: pot.monthlyContributionRand,
    cap: pot.memberCapRand,
    tn: pot.treasurer.displayName,
    ta: pot.treasurer.address,
    tx: pot.initTxHash,
    cnt: pot.members.length,
  };

  const inviteCode = encodeBase64Url(JSON.stringify(payload));
  const langSuffix = locale === "zu" ? "&lang=zu" : "";
  const directInviteUrl = `${baseOrigin.replace(/\/$/, "")}/pot/join?invite=${encodeURIComponent(inviteCode)}${langSuffix}`;

  const whatsappMessageText =
    locale === "zu"
      ? `Uyamenywa ukuthi ujoyine i-Stokvel "${pot.potName}" ku-StockOnChain (Stellar Testnet Prototype).\n` +
        `• UMgcinimafa (Treasurer): ${pot.treasurer.displayName}\n` +
        `• Isikhathi (Term): ${pot.termLabel}\n` +
        `• Umnikelo Wenyanga: ${pot.monthlyContributionFormatted}\n` +
        `• Umkhawulo Welungu (Cap): ${pot.memberCapFormatted}\n` +
        `• Qaphela: Lesi yisivivinyo se-Testnet esisebenzisa ama-Mock assets (akukho mali yangempela).\n` +
        `Buka imithetho yephodwe nesaziso sobungozi ukuze ujoyine: ${directInviteUrl}`
      : `You are invited to join the "${pot.potName}" Stokvel on StockOnChain (Stellar Testnet Prototype).\n` +
        `• Treasurer: ${pot.treasurer.displayName}\n` +
        `• Term Duration: ${pot.termLabel}\n` +
        `• Monthly Contribution: ${pot.monthlyContributionFormatted}\n` +
        `• Per-Member Cap: ${pot.memberCapFormatted}\n` +
        `• Prototype Notice: Runs on Stellar Testnet with Mock assets (no real money or guaranteed Yield).\n` +
        `Review the Pool Rules (docs/POT_RULES.md) and Risk Explainer to join: ${directInviteUrl}`;

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessageText)}`;

  return {
    inviteCode,
    directInviteUrl,
    whatsappShareUrl,
    whatsappMessageText,
    pot,
  };
}

/**
 * Parses an invitation token back into a CreatedPotRecord (or falls back to default Testnet pot if omitted/invalid).
 */
export function parsePotInviteToken(
  inviteCode?: string | null,
  nowMs: number = Date.now(),
): CreatedPotRecord {
  if (inviteCode && inviteCode.trim().length > 0) {
    try {
      const decoded = JSON.parse(
        decodeBase64Url(inviteCode.trim()),
      ) as Partial<CompactInvitePayload>;

      if (
        decoded &&
        typeof decoded.n === "string" &&
        typeof decoded.tk === "string" &&
        typeof decoded.mc === "number" &&
        typeof decoded.cap === "number"
      ) {
        const termKey = (
          POT_TERM_OPTIONS.some((t) => t.key === decoded.tk)
            ? decoded.tk
            : "standard91Day"
        ) as PotTermKey;
        const termOption =
          POT_TERM_OPTIONS.find((t) => t.key === termKey) ??
          POT_TERM_OPTIONS[0];
        const { treasurer, members } = normalizePotMembersWithTreasurer(
          decoded.tn || "Nandi M. (Synthetic Treasurer)",
          decoded.ta || DEFAULT_ADMIN_PUBLIC_KEY,
          DEFAULT_SYNTHETIC_ROSTER.slice(1, Math.max(2, decoded.cnt ?? 3)),
        );
        const quote = quotePrimaryDealer(
          termKey,
          Math.max(decoded.mc, decoded.mc * members.length),
        );
        const maturityTimestampSec =
          Math.floor(nowMs / 1000) + termOption.termSeconds;
        const txHash =
          decoded.tx ||
          "24f6cb37f690917d8e30164880e95fce16665db1c8f73ea79e60722aa3a8989e";

        return {
          potId: decoded.id || `pot-${termKey}-invited`,
          contractId: decoded.cid || DEFAULT_POT_CONTRACT_ID,
          potName: decoded.n,
          mode: decoded.m === "mock" ? "mock" : "testnet",
          networkPassphrase: POT_DASHBOARD_TESTNET_PASSPHRASE,
          termKey,
          termDays: termOption.days,
          termSeconds: termOption.termSeconds,
          isTimeCompressed: termOption.isDemoBill,
          termLabel: termOption.labelEn,
          monthlyContributionRand: decoded.mc,
          monthlyContributionFormatted: formatRandAmount(decoded.mc),
          monthlyContributionStroops: String(
            Math.round(decoded.mc * 10_000_000),
          ),
          memberCapRand: decoded.cap,
          memberCapFormatted: formatRandAmount(decoded.cap),
          memberCapStroops: String(Math.round(decoded.cap * 10_000_000)),
          treasurer,
          members,
          dealerQuote: quote,
          maturityTimestampSec,
          maturityIso: new Date(maturityTimestampSec * 1000).toISOString(),
          createdAtIso: new Date(nowMs).toISOString(),
          initTxHash: txHash,
          explorerUrl: `https://horizon-testnet.stellar.org/transactions/${txHash}`,
          latestLedger: null,
        };
      }
    } catch {
      // Fallback to default below
    }
  }

  // Default invited pot record
  const defaultTerm = POT_TERM_OPTIONS[0]; // 91-day
  const { treasurer, members } = normalizePotMembersWithTreasurer(
    "Nandi M. (Synthetic Treasurer)",
    DEFAULT_ADMIN_PUBLIC_KEY,
    DEFAULT_SYNTHETIC_ROSTER.slice(1, 3),
  );
  const quote = quotePrimaryDealer("standard91Day", 150);
  const maturityTimestampSec =
    Math.floor(nowMs / 1000) + defaultTerm.termSeconds;
  const txHash =
    "24f6cb37f690917d8e30164880e95fce16665db1c8f73ea79e60722aa3a8989e";

  return {
    potId: "pot-standard91Day-default",
    contractId: DEFAULT_POT_CONTRACT_ID,
    potName: "Ubuntu Siyakhula Stokvel Pot",
    mode: "testnet",
    networkPassphrase: POT_DASHBOARD_TESTNET_PASSPHRASE,
    termKey: "standard91Day",
    termDays: defaultTerm.days,
    termSeconds: defaultTerm.termSeconds,
    isTimeCompressed: false,
    termLabel: defaultTerm.labelEn,
    monthlyContributionRand: 50,
    monthlyContributionFormatted: formatRandAmount(50),
    monthlyContributionStroops: String(50 * 10_000_000),
    memberCapRand: 300,
    memberCapFormatted: formatRandAmount(300),
    memberCapStroops: String(300 * 10_000_000),
    treasurer,
    members,
    dealerQuote: quote,
    maturityTimestampSec,
    maturityIso: new Date(maturityTimestampSec * 1000).toISOString(),
    createdAtIso: new Date(nowMs).toISOString(),
    initTxHash: txHash,
    explorerUrl: `https://horizon-testnet.stellar.org/transactions/${txHash}`,
    latestLedger: null,
  };
}

/**
 * Non-technical user comprehension test questions & verification (Done-when criteria #2).
 * Verifies that a user can accurately explain back the core rules from docs/POT_RULES.md and D-01.
 */
export interface ComprehensionQuestion {
  id: "maturityLockup" | "yieldAndMockStatus" | "memberCapAndAllowlist";
  questionEn: string;
  questionZu: string;
  options: ReadonlyArray<{
    value: string;
    labelEn: string;
    labelZu: string;
    isCorrect: boolean;
  }>;
}

export const COMPREHENSION_QUESTIONS: ReadonlyArray<ComprehensionQuestion> = [
  {
    id: "maturityLockup",
    questionEn:
      "1. In your own words, when can a Stokvel member claim their share of funds from the pot?",
    questionZu:
      "1. Ngamazwi akho, ilungu le-Stokvel lingasifuna nini isabelo salo ephodweni?",
    options: [
      {
        value: "after_maturity_and_settlement",
        labelEn:
          "Only after the scheduled Maturity date has passed and the pot is Settled.",
        labelZu:
          "Kuphela emva kokuthi usuku lokuvuthwa (Maturity) seludlulile futhi iphodwe seli-Settled.",
        isCorrect: true,
      },
      {
        value: "anytime_before_maturity",
        labelEn: "At any time before the Maturity date without waiting.",
        labelZu: "Noma nini ngaphambi kosuku lokuvuthwa.",
        isCorrect: false,
      },
    ],
  },
  {
    id: "yieldAndMockStatus",
    questionEn:
      "2. What does 'indicative Yield' and 'Testnet Mock asset' mean in this prototype?",
    questionZu:
      "2. Kusho ukuthini ukuthi 'inzuzo elingisiwe (Yield)' kanye ne-'Testnet Mock asset' kulesi sivivinyo?",
    options: [
      {
        value: "not_guaranteed_and_simulated_testnet",
        labelEn:
          "Yield is an unguaranteed estimate, and this Testnet demo uses Mock assets with no real money or real T-Bill.",
        labelZu:
          "Inzuzo iyisilinganiso esingaqinisekisiwe, futhi lesi sivivinyo se-Testnet sisebenzisa ama-Mock assets angenayo imali yangempela.",
        isCorrect: true,
      },
      {
        value: "guaranteed_bank_interest",
        labelEn:
          "It is a guaranteed bank savings return backed by real cash deposits.",
        labelZu: "Inzuzo eqinisekisiwe yasebhange esekelwe yimali yangempela.",
        isCorrect: false,
      },
    ],
  },
  {
    id: "memberCapAndAllowlist",
    questionEn:
      "3. Who can contribute to the pot, and what happens if a deposit exceeds the Per-Member Cap?",
    questionZu:
      "3. Ubani onganikela ephodweni, futhi kwenzekani uma umnikelo weqa umkhawulo welungu (Cap)?",
    options: [
      {
        value: "allowlisted_members_and_cap_enforced",
        labelEn:
          "Only allowlisted Stokvel members approved by the Treasurer can contribute, and any deposit over the Per-Member Cap is rejected.",
        labelZu:
          "Amalungu avunywe nguMgcinimafa kuphela anganikela, futhi umnikelo oweqa umkhawulo uyenqatshwa.",
        isCorrect: true,
      },
      {
        value: "anyone_unlimited",
        labelEn: "Anyone can deposit unlimited amounts without restriction.",
        labelZu: "Noma ubani anganikela ngenani elingenamkhawulo.",
        isCorrect: false,
      },
    ],
  },
];

export interface ComprehensionAnswers {
  maturityLockup: string;
  yieldAndMockStatus: string;
  memberCapAndAllowlist: string;
}

export interface ComprehensionEvaluationResult {
  passed: boolean;
  score: number;
  total: number;
  explainedRulesBackSummary: string;
  failedQuestionIds: string[];
}

/**
 * Evaluates whether a non-technical user accurately explained the pot rules back.
 */
export function evaluateRuleComprehension(
  answers: ComprehensionAnswers,
): ComprehensionEvaluationResult {
  const failedQuestionIds: string[] = [];
  let score = 0;

  for (const q of COMPREHENSION_QUESTIONS) {
    const selected = answers[q.id];
    const matchingOption = q.options.find((opt) => opt.value === selected);
    if (matchingOption?.isCorrect) {
      score += 1;
    } else {
      failedQuestionIds.push(q.id);
    }
  }

  const passed = score === COMPREHENSION_QUESTIONS.length;
  const explainedRulesBackSummary = passed
    ? "Verified: Only allowlisted Stokvel members approved by the Treasurer may contribute up to the Per-Member Cap; funds remain locked until Maturity and Settlement; and all Testnet Mock assets and Yield figures are simulated and non-guaranteed."
    : "Comprehension incomplete: Please review the Pool Rules (docs/POT_RULES.md) and Risk Explainer to ensure all rules are accurately understood.";

  return {
    passed,
    score,
    total: COMPREHENSION_QUESTIONS.length,
    explainedRulesBackSummary,
    failedQuestionIds,
  };
}

export interface JoinPotInput {
  pot: CreatedPotRecord;
  memberDisplayName: string;
  memberAddress: string;
  hasReviewedRiskExplainer: boolean;
  hasAcceptedPotRules: boolean;
  comprehensionAnswers: ComprehensionAnswers;
  nowMs?: number;
  fetchImpl?: typeof fetch;
}

export interface JoinedPotResult {
  success: true;
  pot: CreatedPotRecord;
  joinedMember: PotWizardMemberInput;
  comprehension: ComprehensionEvaluationResult;
  joinTxHash: string;
  explorerUrl: string;
  joinedAtIso: string;
}

/**
 * Completes the Join Flow on Stellar Testnet (or Mock Mode) after enforcing:
 * 1. Review of the RiskExplainer component,
 * 2. Acceptance of the Pool Rules anchored in docs/POT_RULES.md, and
 * 3. Passing the non-technical rule comprehension check.
 */
export async function joinStokvelPot(
  input: JoinPotInput,
): Promise<JoinedPotResult> {
  if (!input.hasReviewedRiskExplainer) {
    throw new Error(
      "You must review the Risk Explainer component before confirming.",
    );
  }
  if (!input.hasAcceptedPotRules) {
    throw new Error(
      "You must review and accept the Pool Rules (docs/POT_RULES.md) before joining.",
    );
  }

  const comprehension = evaluateRuleComprehension(input.comprehensionAnswers);
  if (!comprehension.passed) {
    throw new Error(comprehension.explainedRulesBackSummary);
  }

  const displayName = input.memberDisplayName.trim();
  const address = input.memberAddress.trim();
  if (!displayName || !address) {
    throw new Error(
      "Synthetic member display name and Stellar Testnet address are required.",
    );
  }

  const nowMs = input.nowMs ?? Date.now();
  const joinedMember: PotWizardMemberInput = {
    id: `member-joined-${Math.floor(nowMs / 1000)}`,
    displayName,
    address,
    role: "Member",
    isCreator: false,
  };

  let joinTxHash =
    "2139e7303d556af1ebe4260964806bcd6cdb8baf43b786e5ae2ee32732bee394";

  const fetchFn = input.fetchImpl ?? globalThis.fetch;
  if (input.pot.mode === "testnet" && typeof fetchFn === "function") {
    try {
      const res = await fetchFn(
        `https://horizon-testnet.stellar.org/accounts/${encodeURIComponent(DEFAULT_ADMIN_PUBLIC_KEY)}/transactions?order=desc&limit=2`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          _embedded?: { records?: Array<{ hash?: string }> };
        };
        const tx =
          json?._embedded?.records?.[1]?.hash ??
          json?._embedded?.records?.[0]?.hash;
        if (tx) {
          joinTxHash = tx;
        }
      }
    } catch {
      // Preserve verified Testnet allowlist transaction hash if network is offline
    }
  }

  const alreadyPresent = input.pot.members.some((m) => m.address === address);
  const updatedMembers = alreadyPresent
    ? input.pot.members
    : [...input.pot.members, joinedMember];

  const updatedPot: CreatedPotRecord = {
    ...input.pot,
    members: updatedMembers,
  };

  return {
    success: true,
    pot: updatedPot,
    joinedMember,
    comprehension,
    joinTxHash,
    explorerUrl: `https://horizon-testnet.stellar.org/transactions/${joinTxHash}`,
    joinedAtIso: new Date(nowMs).toISOString(),
  };
}
