/**
 * @stockonchain/chain - Localized Formatting Utilities (A-07)
 *
 * Implements South African Rand (en-ZA) currency formatting, percentage formatting,
 * and countdown formatters adhering strictly to project guidelines (G9).
 *
 * Expected Rand format: "R 1 234,50" (R prefix, space thousand separator, comma decimal separator).
 */
export interface CountdownResult {
    remainingSeconds: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isMatured: boolean;
    formatted: string;
}
/**
 * Formats a numeric amount or string into localized en-ZA South African Rand currency string.
 * Example: 1234.5 -> "R 1 234,50"
 */
export declare function formatRand(amount: number | string | bigint): string;
/**
 * Parses a Rand formatted string back into a JavaScript number.
 * Example: "R 1 234,50" -> 1234.5
 */
export declare function parseRandToNumber(randStr: string): number;
/**
 * Formats a percentage number with specified decimal precision.
 * Example: formatPercentage(8.25, 2) -> "8.25%"
 */
export declare function formatPercentage(value: number, decimals?: number): string;
/**
 * Formats countdown time remaining until a target Unix timestamp (seconds).
 */
export declare function formatCountdown(targetTimestampSec: number, nowSec?: number): CountdownResult;
