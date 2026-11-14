/**
 * @stockonchain/chain - Mock Mode Fixtures (A-07)
 *
 * Provides realistic mock fixtures for the Stokvel Pot, Members, Asset Holdings,
 * and Attestations so frontend developers (Kea) can build, render, and test all
 * UI views before contracts are deployed.
 */
import { PotViewModel } from './models';
export declare const MOCK_POT_FIXTURE: PotViewModel;
/**
 * Checks if mock mode is activated via environment variable NEXT_PUBLIC_MOCK_MODE.
 */
export declare function isMockModeActive(env?: Record<string, string | undefined>): boolean;
/**
 * Returns mock pot data for testing or previewing before smart contract deployment.
 */
export declare function getPotData(potId?: string): PotViewModel;
