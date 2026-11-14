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
import { type DealerQuote, type TreasuryProductKey } from "./dealer";
import { type PotDashboardMode } from "./pot-dashboard";
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
export declare const POT_TERM_OPTIONS: ReadonlyArray<PotTermOption>;
/**
 * Plain-Language Glossary established in D-01 (docs/RESEARCH.md).
 * Guardrail G4: All terminology used in the UI and documentation strictly adheres to this glossary.
 */
export interface GlossaryTermEntry {
    term: "Stokvel" | "Treasurer" | "T-Bill" | "Custodian" | "Maturity" | "Yield" | "Testnet" | "Wallet key" | "Trustline" | "Mock asset" | "Attestation" | "Soroban";
    meaningEn: string;
    meaningZu: string;
}
export declare const D01_GLOSSARY: ReadonlyArray<GlossaryTermEntry>;
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
export declare const POT_RULES_ANCHORED_SUMMARY: ReadonlyArray<PotRuleSummaryItem>;
export interface PotWizardMemberInput {
    id: string;
    displayName: string;
    address: string;
    role: "Treasurer" | "Member";
    phoneSynthetic?: string;
    isCreator: boolean;
}
export declare const DEFAULT_SYNTHETIC_ROSTER: ReadonlyArray<PotWizardMemberInput>;
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
export declare function normalizePotMembersWithTreasurer(creatorName?: string, creatorAddress?: string, additionalMembers?: PotWizardMemberInput[]): {
    treasurer: PotWizardMemberInput;
    members: PotWizardMemberInput[];
};
/**
 * Executes Pot Creation on Stellar Testnet (or Mock Mode), automatically assigning
 * the creator to the Treasurer role and returning the initialized pot record.
 */
export declare function createStokvelPot(input: CreatePotInput): Promise<CreatedPotRecord>;
/**
 * Generates a direct invitation link and WhatsApp share integration for a created Stokvel pot.
 */
export declare function generatePotInvite(pot: CreatedPotRecord, baseOrigin?: string, locale?: "en" | "zu"): PotInvitationPackage;
/**
 * Parses an invitation token back into a CreatedPotRecord (or falls back to default Testnet pot if omitted/invalid).
 */
export declare function parsePotInviteToken(inviteCode?: string | null, nowMs?: number): CreatedPotRecord;
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
export declare const COMPREHENSION_QUESTIONS: ReadonlyArray<ComprehensionQuestion>;
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
export declare function evaluateRuleComprehension(answers: ComprehensionAnswers): ComprehensionEvaluationResult;
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
export declare function joinStokvelPot(input: JoinPotInput): Promise<JoinedPotResult>;
