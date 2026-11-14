"use strict";
/**
 * @stockonchain/chain - Mock Mode Fixtures (A-07)
 *
 * Provides realistic mock fixtures for the Stokvel Pot, Members, Asset Holdings,
 * and Attestations so frontend developers (Kea) can build, render, and test all
 * UI views before contracts are deployed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_POT_FIXTURE = void 0;
exports.isMockModeActive = isMockModeActive;
exports.getPotData = getPotData;
const format_1 = require("./format");
exports.MOCK_POT_FIXTURE = {
    id: 'pot-mock-001',
    name: 'Family & Friends Stokvel',
    status: 'Open',
    targetBalance: 1000,
    targetBalanceFormatted: (0, format_1.formatRand)(1000),
    currentBalance: 750,
    currentBalanceFormatted: (0, format_1.formatRand)(750),
    fundingProgressPercent: 75,
    memberCap: 200,
    memberCapFormatted: (0, format_1.formatRand)(200),
    totalMembers: 5,
    isMock: true,
    modeLabel: 'MOCK DATA (SIMULATION)',
    members: [
        {
            id: 'member-1',
            name: 'Kea (You)',
            address: 'GDYQW3VZ3N5N5M2K6DTHW5U2B3J6OQZ7K4Z5X9M8W7Q6P5L4K3J2I1H',
            contributedAmount: 200,
            contributedFormatted: (0, format_1.formatRand)(200),
            sharePercentage: 26.67,
            sharePercentageFormatted: (0, format_1.formatPercentage)(26.67, 1),
            estimatedPayout: 204.12,
            estimatedPayoutFormatted: (0, format_1.formatRand)(204.12),
            hasClaimed: false,
            isCurrentUser: true,
        },
        {
            id: 'member-2',
            name: 'Thabo',
            address: 'GAA7L4XQ9M8W7Q6P5L4K3J2I1HGDYQW3VZ3N5N5M2K6DTHW5U2B3J6OQZ',
            contributedAmount: 200,
            contributedFormatted: (0, format_1.formatRand)(200),
            sharePercentage: 26.67,
            sharePercentageFormatted: (0, format_1.formatPercentage)(26.67, 1),
            estimatedPayout: 204.12,
            estimatedPayoutFormatted: (0, format_1.formatRand)(204.12),
            hasClaimed: false,
        },
        {
            id: 'member-3',
            name: 'Nandi',
            address: 'GBB8M5YR1N9X8R7Q6M5L4K3J2I1HEXZ7L4XQ9M8W7Q6P5L4K3J2I1HAAA',
            contributedAmount: 150,
            contributedFormatted: (0, format_1.formatRand)(150),
            sharePercentage: 20.0,
            sharePercentageFormatted: (0, format_1.formatPercentage)(20.0, 1),
            estimatedPayout: 153.09,
            estimatedPayoutFormatted: (0, format_1.formatRand)(153.09),
            hasClaimed: false,
        },
        {
            id: 'member-4',
            name: 'Sipho',
            address: 'GCC9N6ZS2P1Y9S8R7N6M5L4K3J2IFY08M5YR1N9X8R7Q6M5L4K3J2I1HBBB',
            contributedAmount: 100,
            contributedFormatted: (0, format_1.formatRand)(100),
            sharePercentage: 13.33,
            sharePercentageFormatted: (0, format_1.formatPercentage)(13.33, 1),
            estimatedPayout: 102.06,
            estimatedPayoutFormatted: (0, format_1.formatRand)(102.06),
            hasClaimed: false,
        },
        {
            id: 'member-5',
            name: 'Zanele',
            address: 'GDD0O7AT3Q2Z0T9S8O7N6M5L4K3JGZ19N6ZS2P1Y9S8R7N6M5L4K3J2ICCC',
            contributedAmount: 100,
            contributedFormatted: (0, format_1.formatRand)(100),
            sharePercentage: 13.33,
            sharePercentageFormatted: (0, format_1.formatPercentage)(13.33, 1),
            estimatedPayout: 102.06,
            estimatedPayoutFormatted: (0, format_1.formatRand)(102.06),
            hasClaimed: false,
        },
    ],
    holdings: {
        assetCode: 'ZATBILL',
        assetIssuer: 'GAISSUERZATBILLMOCKTESTNET000000000000000000000000000000000000',
        name: '91-Day RSA Treasury Bill (Tokenized)',
        heldUnits: 1000,
        heldUnitsFormatted: '1 000 ZATBILL',
        parValueMzar: 1000,
        parValueFormatted: (0, format_1.formatRand)(1000),
        indicativeYieldPercent: 8.25,
        indicativeYieldFormatted: '8.25% p.a. (indicative)',
        custodianAddress: 'GCUSTODIAN0000000000000000000000000000000000000000000000000000',
        isAttested: true,
    },
    backing: {
        attestedReserves: 1000000,
        attestedReservesFormatted: (0, format_1.formatRand)(1000000),
        issuedTokens: 1000000,
        issuedTokensFormatted: (0, format_1.formatRand)(1000000),
        backingRatio: 1.0,
        backingRatioFormatted: '100.0%',
        isFullyBacked: true,
        statusLabel: 'Fully Backed',
    },
};
/**
 * Checks if mock mode is activated via environment variable NEXT_PUBLIC_MOCK_MODE.
 */
function isMockModeActive(env = process.env) {
    return env.NEXT_PUBLIC_MOCK_MODE === 'true' || env.NEXT_PUBLIC_MOCK_MODE === '1';
}
/**
 * Returns mock pot data for testing or previewing before smart contract deployment.
 */
function getPotData(potId) {
    return {
        ...exports.MOCK_POT_FIXTURE,
        id: potId || exports.MOCK_POT_FIXTURE.id,
    };
}
