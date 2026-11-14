import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatRand,
  formatPercentage,
  formatCountdown,
  parseRandToNumber,
} from './format';
import {
  extractContractErrorCode,
  mapFailureToSafeError,
  SAFE_FAILURE_DEFINITIONS,
} from './errors';
import {
  isMockModeActive,
  getPotData,
  MOCK_POT_FIXTURE,
} from './mock-fixtures';

test('formatRand formats currency strictly according to en-ZA standards', () => {
  const formatted1 = formatRand(1234.5);
  assert.equal(formatted1.replace(/[\u00a0\u202f]/g, ' '), 'R 1 234,50');

  const formatted2 = formatRand(100);
  assert.equal(formatted2.replace(/[\u00a0\u202f]/g, ' '), 'R 100,00');

  const formattedZero = formatRand(0);
  assert.equal(formattedZero.replace(/[\u00a0\u202f]/g, ' '), 'R 0,00');

  const formattedLarge = formatRand(1000000);
  assert.equal(formattedLarge.replace(/[\u00a0\u202f]/g, ' '), 'R 1 000 000,00');

  assert.throws(() => formatRand(Number.NaN), RangeError);
});

test('formatPercentage formats percentages accurately', () => {
  assert.equal(formatPercentage(5.5), '5.5%');
  assert.equal(formatPercentage(100), '100.0%');
  assert.equal(formatPercentage(8.25, 2), '8.25%');
});

test('formatCountdown calculates correct time remaining', () => {
  const now = 1700000000;
  const targetFuture = now + 90000; // 1 day, 1 hour, 0 mins
  const countdown = formatCountdown(targetFuture, now);
  assert.equal(countdown.isMatured, false);
  assert.equal(countdown.days, 1);
  assert.equal(countdown.hours, 1);
  assert.equal(countdown.formatted, '1d 1h 0m');

  const targetPast = now - 100;
  const maturedCountdown = formatCountdown(targetPast, now);
  assert.equal(maturedCountdown.isMatured, true);
  assert.equal(maturedCountdown.formatted, 'Matured');
});

test('parseRandToNumber parses Rand strings correctly', () => {
  assert.equal(parseRandToNumber('R 1 234,50'), 1234.5);
  assert.equal(parseRandToNumber('R 100,00'), 100);
  assert.equal(parseRandToNumber('1234.50'), 1234.5);
});

test('error mapping translates all failure scenarios from T-08 to friendly messages', () => {
  // NotMember (error code 6)
  const err6 = mapFailureToSafeError('HostError: Error(Contract, #6)');
  assert.equal(err6.code, 'NOT_MEMBER');
  assert.equal(err6.title, SAFE_FAILURE_DEFINITIONS.NOT_MEMBER.title);
  assert.ok(err6.userMessage.length > 0);
  assert.ok(err6.remedy.length > 0);

  // OverCap (error code 7)
  const err7 = mapFailureToSafeError('ContractError(7)');
  assert.equal(err7.code, 'OVER_CAP');
  assert.equal(err7.title, SAFE_FAILURE_DEFINITIONS.OVER_CAP.title);

  // Paused (error code 8)
  const err8 = mapFailureToSafeError('ContractError(8)');
  assert.equal(err8.code, 'PAUSED');

  // WrongState (error code 9)
  const err9 = mapFailureToSafeError('ContractError(9)');
  assert.equal(err9.code, 'WRONG_STATE');

  // ZeroAmount (error code 10)
  const err10 = mapFailureToSafeError('ContractError(10)');
  assert.equal(err10.code, 'ZERO_AMOUNT');

  // NotMatured (error code 11)
  const err11 = mapFailureToSafeError('ContractError(11)');
  assert.equal(err11.code, 'NOT_MATURED');

  // AlreadyClaimed (error code 12)
  const err12 = mapFailureToSafeError('ContractError(12)');
  assert.equal(err12.code, 'ALREADY_CLAIMED');

  // ExceedsAttestedReserves (error code 18)
  const err18 = mapFailureToSafeError('Error::ExceedsAttestedReserves');
  assert.equal(err18.code, 'EXCEEDS_ATTESTED_RESERVES');

  // KYC Unverified
  const unverified = mapFailureToSafeError('op_not_authorized', { isUnverified: true });
  assert.equal(unverified.code, 'UNVERIFIED_TRANSFER');

  // Frozen Account
  const frozen = mapFailureToSafeError('op_not_authorized', { isFrozen: true });
  assert.equal(frozen.code, 'FROZEN_ACCOUNT');

  // Network check
  const netErr = mapFailureToSafeError('Error: STELLAR_NETWORK must be explicitly set to testnet.');
  assert.equal(netErr.code, 'WRONG_NETWORK');
});

test('mock-fixtures provides clean fixtures and respects NEXT_PUBLIC_MOCK_MODE', () => {
  assert.equal(MOCK_POT_FIXTURE.id, 'pot-mock-001');
  assert.equal(MOCK_POT_FIXTURE.members.length, 5);

  const potData = getPotData('pot-mock-001');
  assert.ok(potData);
  assert.equal(potData.name, 'Family & Friends Stokvel');

  assert.equal(isMockModeActive({ NEXT_PUBLIC_MOCK_MODE: 'true' }), true);
  assert.equal(isMockModeActive({ NEXT_PUBLIC_MOCK_MODE: 'false' }), false);
  assert.equal(isMockModeActive({}), false);
});
