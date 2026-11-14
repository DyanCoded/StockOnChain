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
import { type TreasuryProductKey } from "./dealer";
export declare const POT_DASHBOARD_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export declare const DEFAULT_POT_CONTRACT_ID = "CBIZM7UPAA7OCRRHSEL43MMDZIKNYQEMB5LB7HZQ32KMV44V6ZW456XM";
export declare const DEFAULT_ADMIN_PUBLIC_KEY = "GAXLZKWGKXFLKLSNYBL3CDXWJKHTPPDFUBX2I6ZRA4V5UBI2HJMFPSEH";
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
export type PotActivityEventType = "initialized" | "member_added" | "contributed" | "invested" | "attestation_verified" | "matured" | "settled" | "claimed";
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
/**
 * Formats a numeric Rand / mZAR value using localized South African Rand formatting (en-ZA).
 */
export declare function formatRandAmount(amount: number): string;
/**
 * Computes a real-time maturity countdown breakdown from a unix timestamp (seconds).
 */
export declare function formatMaturityCountdown(maturityTimestampSec: number, termDurationSeconds?: number, nowMs?: number): MaturityCountdownView;
export interface PotDashboardOptions {
    mode?: PotDashboardMode;
    productKey?: ProductTermKey;
    stateOverride?: PotLifecycleState;
    emptyActivity?: boolean;
    extraContributionMzar?: number;
    nowMs?: number;
    contractId?: string;
}
/**
 * Generates deterministic, offline-safe synthetic Pot Dashboard data in Mock Mode.
 */
export declare function getMockPotDashboardData(options?: PotDashboardOptions): PotDashboardData;
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
export declare function fetchLiveTestnetPotDashboardData(options?: LiveTestnetFetchOptions): Promise<PotDashboardData>;
/**
 * Minimal React hooks adapter so @stockonchain/chain works seamlessly in both
 * React components and Node.js unit tests without adding React as a package dependency.
 */
export interface ChainReactHooksAdapter {
    useState: <T>(initial: T | (() => T)) => [T, (next: T | ((prev: T) => T)) => void];
    useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
}
export declare function registerChainReactHooks(adapter: ChainReactHooksAdapter): void;
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
export declare function usePotDashboard(params?: UsePotDashboardParams, hooksOverride?: ChainReactHooksAdapter): UsePotDashboardResult;
