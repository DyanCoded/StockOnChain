/**
 * @stockonchain/chain - Primary Dealer Pricing & Yield Engine (T-05 / A-03)
 *
 * Implements South African Treasury Bill discount pricing and annualized yield
 * calculation following official SARB (South African Reserve Bank) money-market
 * actual/365 day-count conventions.
 *
 * AI Guardrails:
 * - G4 Verify, do not trust: Formulas adhere to SARB Money Market tender standards.
 * - G6 Honesty: Rates and yields are explicitly flagged as indicative and non-guaranteed.
 */

export type TreasuryProductKey =
  | "standard91Day"
  | "standard182Day"
  | "standard364Day"
  | "demoTimeCompressed";

export interface TreasuryBillProduct {
  id:
    | "standard-91-day"
    | "standard-182-day"
    | "standard-364-day"
    | "demo-time-compressed";
  name: string;
  termDays: number;
  termSeconds: number;
  faceValuePerUnit: number; // e.g. R1.00 per ZATBILL
  indicativeAnnualRate: number; // e.g. 0.0825 (8.25% p.a.)
  isTimeCompressed: boolean;
  label: string;
}

export const SARB_TILL_BENCHMARKS = {
  // Typical South African Treasury Bill auction clearing rate ranges (Actual/365 convention)
  // Source: SARB Weekly Treasury Bill Tender Results
  indicative91DayRate: 0.0825, // 8.25% p.a.
  indicative182DayRate: 0.084, // 8.40% p.a.
  indicative364DayRate: 0.0855, // 8.55% p.a.
  daysPerYear: 365,
};

export const TREASURY_PRODUCTS: Record<TreasuryProductKey, TreasuryBillProduct> = {
  standard91Day: {
    id: "standard-91-day",
    name: "91-Day South African Treasury Bill",
    termDays: 91,
    termSeconds: 91 * 86400, // 7,862,400 seconds
    faceValuePerUnit: 1.0, // R1.00 face value
    indicativeAnnualRate: SARB_TILL_BENCHMARKS.indicative91DayRate,
    isTimeCompressed: false,
    label: "Standard 91-Day Product",
  },
  standard182Day: {
    id: "standard-182-day",
    name: "182-Day South African Treasury Bill",
    termDays: 182,
    termSeconds: 182 * 86400, // 15,724,800 seconds
    faceValuePerUnit: 1.0, // R1.00 face value
    indicativeAnnualRate: SARB_TILL_BENCHMARKS.indicative182DayRate,
    isTimeCompressed: false,
    label: "Standard 182-Day Product",
  },
  standard364Day: {
    id: "standard-364-day",
    name: "364-Day South African Treasury Bill",
    termDays: 364,
    termSeconds: 31_449_600, // 364 * 86400 seconds
    faceValuePerUnit: 1.0, // R1.00 face value
    indicativeAnnualRate: SARB_TILL_BENCHMARKS.indicative364DayRate,
    isTimeCompressed: false,
    label: "Standard 364-Day Product",
  },
  demoTimeCompressed: {
    id: "demo-time-compressed",
    name: "Time-Compressed Demo Treasury Bill",
    termDays: 91, // Financial rate models standard 91-day discount
    termSeconds: 120, // 2 minutes (120 seconds) for live testnet verification
    faceValuePerUnit: 1.0, // R1.00 face value
    indicativeAnnualRate: 0.1, // 10.00% p.a. demo rate for clear visual yield
    isTimeCompressed: true,
    label: "time compressed for demo",
  },
};

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
export function calculateDiscountPrice(
  faceValue: number,
  annualDiscountRate: number,
  termDays: number,
): number {
  if (faceValue <= 0) throw new Error("Face value must be positive.");
  if (annualDiscountRate < 0)
    throw new Error("Discount rate cannot be negative.");
  if (termDays <= 0) throw new Error("Term days must be positive.");

  const discountFraction =
    (annualDiscountRate * termDays) / SARB_TILL_BENCHMARKS.daysPerYear;
  const price = faceValue * (1 - discountFraction);
  // Round price to 6 decimal places for token precision
  return Math.round(price * 1_000_000) / 1_000_000;
}

/**
 * Calculates standard money-market annualized yield from discount price and face value:
 * Yield = ((Face - Price) / Price) * (365 / TermDays)
 *
 * @param faceValue Face value at maturity
 * @param price Purchase price
 * @param termDays Tenor in days
 */
export function calculateAnnualizedYield(
  faceValue: number,
  price: number,
  termDays: number,
): number {
  if (price <= 0) throw new Error("Price must be positive.");
  if (faceValue <= price) return 0;
  if (termDays <= 0) throw new Error("Term days must be positive.");

  const holdingPeriodYield = (faceValue - price) / price;
  const annualized =
    holdingPeriodYield * (SARB_TILL_BENCHMARKS.daysPerYear / termDays);
  return Math.round(annualized * 10_000) / 10_000;
}

/**
 * Quotes a primary dealer discount price and expected ZATBILL delivery for a pot investment.
 */
export function quotePrimaryDealer(
  productKey: TreasuryProductKey,
  investmentAmountMzar: number,
  customAnnualRate?: number,
): DealerQuote {
  const product = TREASURY_PRODUCTS[productKey];
  if (!product) throw new Error(`Unknown product key: ${productKey}`);
  if (investmentAmountMzar <= 0)
    throw new Error("Investment amount must be positive.");

  const rate = customAnnualRate ?? product.indicativeAnnualRate;
  const discountPrice = calculateDiscountPrice(
    product.faceValuePerUnit,
    rate,
    product.termDays,
  );
  const annualizedYield = calculateAnnualizedYield(
    product.faceValuePerUnit,
    discountPrice,
    product.termDays,
  );

  // Number of ZATBILL tokens (1 ZATBILL = R1.00 face value)
  // For investment amount M and price P per token: Z = floor(M / P)
  const zatbillTokens = Math.floor(investmentAmountMzar / discountPrice);
  const faceValueSettlement = zatbillTokens * product.faceValuePerUnit;
  const indicativeProfit = faceValueSettlement - investmentAmountMzar;

  return {
    productId: product.id,
    productName: product.name,
    isTimeCompressed: product.isTimeCompressed,
    label: product.label,
    termDays: product.termDays,
    termSeconds: product.termSeconds,
    faceValuePerUnit: product.faceValuePerUnit,
    discountPricePerUnit: discountPrice,
    annualizedYield,
    annualizedYieldFormatted: `${(annualizedYield * 100).toFixed(2)}% p.a. (indicative)`,
    investmentAmountMzar,
    zatbillTokensReceived: zatbillTokens,
    faceValueSettlementMzar: faceValueSettlement,
    indicativeProfitMzar: Math.round(indicativeProfit * 100) / 100,
    disclaimer:
      "All yields are indicative and non-guaranteed demo simulations. No actual South African Government Treasury Bill, regulated banking product, or reserve is held.",
  };
}

/**
 * Member share reconciliation helper.
 * Reconciles pro-rata member payouts down to the cent, proving that:
 * 1. Sum of payouts <= totalSettlement (no overpayments).
 * 2. Residual dust remainder is strictly less than 1 cent per member.
 * 3. Exact reconciliation: sum(payouts) + potRemainder === totalSettlement.
 */
export function reconcileMemberPayouts(
  members: Array<{ member: string; shares: bigint }>,
  totalSettlementStroops: bigint,
): {
  payouts: Array<{ member: string; payout: bigint; payoutRand: string }>;
  totalShares: bigint;
  sumPayouts: bigint;
  potRemainder: bigint;
  reconciledToCent: boolean;
} {
  const totalShares = members.reduce((sum, m) => sum + m.shares, 0n);
  if (totalShares <= 0n) {
    throw new Error("Total shares must be greater than zero.");
  }

  let sumPayouts = 0n;
  const payouts = members.map((m) => {
    // Pro-rata integer division formula: (shares * settlement) / totalShares
    const payout = (m.shares * totalSettlementStroops) / totalShares;
    sumPayouts += payout;
    const rand = (Number(payout) / 10_000_000).toFixed(2);
    return {
      member: m.member,
      payout,
      payoutRand: `R ${rand}`,
    };
  });

  const potRemainder = totalSettlementStroops - sumPayouts;
  // In Stellar, 1 cent = R0.01 = 100,000 stroops
  // Remainder must be non-negative and less than total members * 1 cent
  const maxAllowableDust = BigInt(members.length) * 100_000n;
  const reconciledToCent =
    potRemainder >= 0n && potRemainder <= maxAllowableDust;

  return {
    payouts,
    totalShares,
    sumPayouts,
    potRemainder,
    reconciledToCent,
  };
}
