import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscountPrice,
  calculateAnnualizedYield,
  quotePrimaryDealer,
  reconcileMemberPayouts,
  TREASURY_PRODUCTS,
  SARB_TILL_BENCHMARKS,
} from './dealer';

test('dealer - SARB Money Market discount pricing formula', () => {
  // Test with standard 91-day bill at 8.25% p.a.
  // P = 1.00 * (1 - (0.0825 * 91 / 365))
  // Discount fraction = 0.0825 * 91 / 365 = 7.5075 / 365 = 0.02056849315...
  // Expected price = 1.00 - 0.02056849315 = 0.979432
  const price = calculateDiscountPrice(1.0, 0.0825, 91);
  assert.equal(price, 0.979432);

  // Test with 10% demo rate for 91 days
  // Discount fraction = 0.10 * 91 / 365 = 9.1 / 365 = 0.02493150684...
  // Expected price = 1 - 0.02493150684 = 0.975068
  const demoPrice = calculateDiscountPrice(1.0, 0.10, 91);
  assert.equal(demoPrice, 0.975068);

  // Negative or zero validations
  assert.throws(() => calculateDiscountPrice(0, 0.0825, 91), /Face value must be positive/);
  assert.throws(() => calculateDiscountPrice(1.0, -0.05, 91), /Discount rate cannot be negative/);
  assert.throws(() => calculateDiscountPrice(1.0, 0.0825, 0), /Term days must be positive/);
});

test('dealer - Annualized yield calculation and guardrail checks', () => {
  // If price is 0.979432 for 1.00 face value over 91 days:
  // Holding period yield = (1 - 0.979432) / 0.979432 = 0.020568 / 0.979432 = 0.021000...
  // Annualized = 0.021000 * (365 / 91) = 0.084227... (approx 8.42%)
  const price = 0.979432;
  const yieldRate = calculateAnnualizedYield(1.0, price, 91);
  assert.equal(yieldRate, 0.0842); // 8.42%

  // Error validations
  assert.throws(() => calculateAnnualizedYield(1.0, 0, 91), /Price must be positive/);
  assert.throws(() => calculateAnnualizedYield(1.0, 0.95, 0), /Term days must be positive/);
  // If face <= price, yield is 0
  assert.equal(calculateAnnualizedYield(1.0, 1.0, 91), 0);
  assert.equal(calculateAnnualizedYield(1.0, 1.05, 91), 0);
});

test('dealer - Product configurations and time-compressed demo bill', () => {
  const std = TREASURY_PRODUCTS.standard91Day;
  assert.equal(std.id, 'standard-91-day');
  assert.equal(std.termDays, 91);
  assert.equal(std.termSeconds, 91 * 86400);
  assert.equal(std.isTimeCompressed, false);

  const demo = TREASURY_PRODUCTS.demoTimeCompressed;
  assert.equal(demo.id, 'demo-time-compressed');
  assert.equal(demo.isTimeCompressed, true);
  assert.equal(demo.label, 'time compressed for demo');
  assert.equal(demo.termSeconds, 120); // 2 minutes for live on-chain lifecycle test
  assert.equal(demo.faceValuePerUnit, 1.0);
});

test('dealer - Primary dealer quote output and non-guaranteed disclaimer', () => {
  const quote = quotePrimaryDealer('demoTimeCompressed', 1000); // R1,000 investment
  assert.equal(quote.productId, 'demo-time-compressed');
  assert.equal(quote.isTimeCompressed, true);
  assert.equal(quote.label, 'time compressed for demo');
  assert.ok(quote.zatbillTokensReceived > 1000); // R1,000 / ~0.975 = ~1025 ZATBILL
  assert.equal(quote.faceValueSettlementMzar, quote.zatbillTokensReceived * 1.0);
  assert.ok(quote.indicativeProfitMzar > 0);
  assert.ok(quote.annualizedYieldFormatted.includes('(indicative)'));
  assert.ok(quote.disclaimer.includes('non-guaranteed demo simulations'));
});

test('dealer - Precision rounding: 5-member pro-rata cent reconciliation', () => {
  // 5 members contributing irregular amounts
  // 1: R100 (1,000,000,000 stroops)
  // 2: R250 (2,500,000,000 stroops)
  // 3: R150 (1,500,000,000 stroops)
  // 4: R300 (3,000,000,000 stroops)
  // 5: R200 (2,000,000,000 stroops)
  // Total contributions: R1,000 (10,000,000,000 stroops)
  const members = [
    { member: 'GBMEMBER1', shares: 1_000_000_000n },
    { member: 'GBMEMBER2', shares: 2_500_000_000n },
    { member: 'GBMEMBER3', shares: 1_500_000_000n },
    { member: 'GBMEMBER4', shares: 3_000_000_000n },
    { member: 'GBMEMBER5', shares: 2_000_000_000n },
  ];

  // At settlement, the dealer delivers face value for 1,025 ZATBILL = R1,025.00
  // Total settlement: 10,250,000,000 stroops
  const totalSettlementStroops = 10_250_000_000n;

  const result = reconcileMemberPayouts(members, totalSettlementStroops);

  assert.equal(result.totalShares, 10_000_000_000n);
  assert.equal(result.reconciledToCent, true);

  // Exact math:
  // Member 1 (10%): R102.50
  // Member 2 (25%): R256.25
  // Member 3 (15%): R153.75
  // Member 4 (30%): R307.50
  // Member 5 (20%): R205.00
  assert.equal(result.payouts[0].payoutRand, 'R 102.50');
  assert.equal(result.payouts[1].payoutRand, 'R 256.25');
  assert.equal(result.payouts[2].payoutRand, 'R 153.75');
  assert.equal(result.payouts[3].payoutRand, 'R 307.50');
  assert.equal(result.payouts[4].payoutRand, 'R 205.00');

  // Exact stroop sum equals settlement total (zero dust in this clean division)
  assert.equal(result.sumPayouts + result.potRemainder, totalSettlementStroops);
  assert.equal(result.potRemainder, 0n);
});

test('dealer - Precision rounding: odd 3-way split (1/3 each) with non-zero dust', () => {
  // 3 members contributing equal shares of 100 stroops each = 300 total shares
  // Settlement total: 1,000 stroops (1000 / 3 = 333 remainder 1)
  const members = [
    { member: 'GA', shares: 100n },
    { member: 'GB', shares: 100n },
    { member: 'GC', shares: 100n },
  ];
  const totalSettlement = 1000n;

  const result = reconcileMemberPayouts(members, totalSettlement);

  // Each member receives floor(100 * 1000 / 300) = 333
  assert.equal(result.payouts[0].payout, 333n);
  assert.equal(result.payouts[1].payout, 333n);
  assert.equal(result.payouts[2].payout, 333n);
  assert.equal(result.sumPayouts, 999n);

  // Pot retains exactly 1 stroop residual (less than 1 cent)
  assert.equal(result.potRemainder, 1n);
  // Strict reconciliation invariant: sum + remainder === total
  assert.equal(result.sumPayouts + result.potRemainder, totalSettlement);
  assert.equal(result.reconciledToCent, true);
});

test('dealer - Precision rounding: 7-way prime division stress test', () => {
  // 7 members with unequal odd prime share distributions
  const members = [
    { member: 'M1', shares: 333_333_333n },
    { member: 'M2', shares: 777_777_777n },
    { member: 'M3', shares: 111_111_111n },
    { member: 'M4', shares: 999_999_999n },
    { member: 'M5', shares: 555_555_555n },
    { member: 'M6', shares: 444_444_444n },
    { member: 'M7', shares: 888_888_888n },
  ];
  // Total settlement: R5,432.17 = 54,321,700,000 stroops
  const totalSettlementStroops = 54_321_700_000n;

  const result = reconcileMemberPayouts(members, totalSettlementStroops);

  // Invariant 1: Sum of payouts <= total settlement (never overpay)
  assert.ok(result.sumPayouts <= totalSettlementStroops);
  // Invariant 2: Exactly reconciles to the stroop with remainder
  assert.equal(result.sumPayouts + result.potRemainder, totalSettlementStroops);
  // Invariant 3: Dust remainder is strictly within allowable 1 cent per member limit
  assert.ok(result.potRemainder >= 0n);
  assert.ok(result.potRemainder < BigInt(members.length) * 100_000n);
  assert.equal(result.reconciledToCent, true);
});
