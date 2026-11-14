/**
 * @stockonchain/chain - View Models (A-07)
 *
 * Defines strongly-typed view models for the stokvel pot, member shares,
 * asset holdings (ZATBILL), countdown timers, and backing ratios.
 */

import { CountdownResult } from './format';

export type PotLifecycleStatus = 'Open' | 'Invested' | 'Matured' | 'Settled';

export interface MemberShareViewModel {
  id: string;
  name: string;
  address: string;
  contributedAmount: number;
  contributedFormatted: string;
  sharePercentage: number;
  sharePercentageFormatted: string;
  estimatedPayout: number;
  estimatedPayoutFormatted: string;
  hasClaimed: boolean;
  isCurrentUser?: boolean;
}

export interface AssetHoldingViewModel {
  assetCode: string;
  assetIssuer: string;
  name: string;
  heldUnits: number;
  heldUnitsFormatted: string;
  parValueMzar: number;
  parValueFormatted: string;
  indicativeYieldPercent: number;
  indicativeYieldFormatted: string;
  custodianAddress: string;
  isAttested: boolean;
}

export interface BackingRatioViewModel {
  attestedReserves: number;
  attestedReservesFormatted: string;
  issuedTokens: number;
  issuedTokensFormatted: string;
  backingRatio: number;
  backingRatioFormatted: string;
  isFullyBacked: boolean;
  statusLabel: 'Fully Backed' | 'Deficit Warning' | 'Pending Attestation';
}

export interface MaturityCountdownViewModel extends CountdownResult {
  targetTimestampSec: number;
  targetDateFormatted: string;
}

export interface PotViewModel {
  id: string;
  name: string;
  status: PotLifecycleStatus;
  targetBalance: number;
  targetBalanceFormatted: string;
  currentBalance: number;
  currentBalanceFormatted: string;
  fundingProgressPercent: number;
  memberCap: number;
  memberCapFormatted: string;
  members: MemberShareViewModel[];
  totalMembers: number;
  holdings?: AssetHoldingViewModel;
  backing?: BackingRatioViewModel;
  countdown?: MaturityCountdownViewModel;
  isMock: boolean;
  modeLabel: string;
}
