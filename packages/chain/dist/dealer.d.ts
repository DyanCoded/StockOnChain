/**
 * @stockonchain/chain - Primary Dealer Pricing & Yield Engine (T-05)
 *
 * Implements South African Treasury Bill discount pricing and annualized yield
 * calculation following official SARB (South African Reserve Bank) money-market
 * actual/365 day-count conventions.
 *
 * AI Guardrails:
 * - G4 Verify, do not trust: Formulas adhere to SARB Money Market tender standards.
 * - G6 Honesty: Rates and yields are explicitly flagged as indicative and non-guaranteed.
 */
export interface TreasuryBillProduct {
    id: "standard-91-day" | "demo-time-compressed";
    name: string;
    termDays: number;
    termSeconds: number;
    faceValuePerUnit: number;
    indicativeAnnualRate: number;
    isTimeCompressed: boolean;
    label: string;
}
export declare const SARB_TILL_BENCHMARKS: {
    indicative91DayRate: number;
    daysPerYear: number;
};
export declare const TREASURY_PRODUCTS: Record<string, TreasuryBillProduct>;
export interface DealerQuote {
    productId: string;
    productName: string;
    isTimeCompressed: boolean;
    label: string;
    termDays: number;
    termSeconds: number;
    faceValuePerUnit: number;
    discountPricePerUnit: number;
    annualizedYield: number;
    annualizedYieldFormatted: string;
    investmentAmountMzar: number;
    zatbillTokensReceived: number;
    faceValueSettlementMzar: number;
    indicativeProfitMzar: number;
    disclaimer: string;
}
/**
 * Calculates the discount purchase price for a Treasury Bill under Actual/365 money market convention.
 * P = F * (1 - (d * t / 365))
 *
 * @param faceValue Face value at maturity (e.g. 1.00)
 * @param annualDiscountRate Annualized discount rate (e.g. 0.0825 for 8.25%)
 * @param termDays Tenor in days (e.g. 91)
 */
export declare function calculateDiscountPrice(faceValue: number, annualDiscountRate: number, termDays: number): number;
/**
 * Calculates standard money-market annualized yield from discount price and face value:
 * Yield = ((Face - Price) / Price) * (365 / TermDays)
 *
 * @param faceValue Face value at maturity
 * @param price Purchase price
 * @param termDays Tenor in days
 */
export declare function calculateAnnualizedYield(faceValue: number, price: number, termDays: number): number;
/**
 * Quotes a primary dealer discount price and expected ZATBILL delivery for a pot investment.
 */
export declare function quotePrimaryDealer(productKey: "standard91Day" | "demoTimeCompressed", investmentAmountMzar: number, customAnnualRate?: number): DealerQuote;
/**
 * Member share reconciliation helper.
 * Reconciles pro-rata member payouts down to the cent, proving that:
 * 1. Sum of payouts <= totalSettlement (no overpayments).
 * 2. Residual dust remainder is strictly less than 1 cent per member.
 * 3. Exact reconciliation: sum(payouts) + potRemainder === totalSettlement.
 */
export declare function reconcileMemberPayouts(members: Array<{
    member: string;
    shares: bigint;
}>, totalSettlementStroops: bigint): {
    payouts: Array<{
        member: string;
        payout: bigint;
        payoutRand: string;
    }>;
    totalShares: bigint;
    sumPayouts: bigint;
    potRemainder: bigint;
    reconciledToCent: boolean;
};
