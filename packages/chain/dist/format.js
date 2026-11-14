"use strict";
/**
 * @stockonchain/chain - Localized Formatting Utilities (A-07)
 *
 * Implements South African Rand (en-ZA) currency formatting, percentage formatting,
 * and countdown formatters adhering strictly to project guidelines (G9).
 *
 * Expected Rand format: "R 1 234,50" (R prefix, space thousand separator, comma decimal separator).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRand = formatRand;
exports.parseRandToNumber = parseRandToNumber;
exports.formatPercentage = formatPercentage;
exports.formatCountdown = formatCountdown;
/**
 * Formats a numeric amount or string into localized en-ZA South African Rand currency string.
 * Example: 1234.5 -> "R 1 234,50"
 */
function formatRand(amount) {
    const numericAmount = typeof amount === 'bigint'
        ? Number(amount)
        : typeof amount === 'string'
            ? parseFloat(amount)
            : amount;
    if (typeof numericAmount !== 'number' || isNaN(numericAmount)) {
        throw new RangeError('Invalid numeric amount for formatRand');
    }
    const parts = numericAmount.toFixed(2).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    // Group integer part in thousands separated by space
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `R ${formattedInteger},${decimalPart}`;
}
// Note: formatRandAmount is also exported in pot-dashboard.ts; export it here as formatRand
// to prevent duplicate export ambiguity.
/**
 * Parses a Rand formatted string back into a JavaScript number.
 * Example: "R 1 234,50" -> 1234.5
 */
function parseRandToNumber(randStr) {
    if (!randStr)
        return 0;
    const clean = randStr
        .replace(/[R\s\u00a0\u202f]/g, '')
        .replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}
/**
 * Formats a percentage number with specified decimal precision.
 * Example: formatPercentage(8.25, 2) -> "8.25%"
 */
function formatPercentage(value, decimals = 1) {
    return `${value.toFixed(decimals)}%`;
}
/**
 * Formats countdown time remaining until a target Unix timestamp (seconds).
 */
function formatCountdown(targetTimestampSec, nowSec = Math.floor(Date.now() / 1000)) {
    const remainingSeconds = Math.max(0, targetTimestampSec - nowSec);
    const isMatured = remainingSeconds <= 0;
    const days = Math.floor(remainingSeconds / (24 * 3600));
    const hours = Math.floor((remainingSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    let formatted = '';
    if (isMatured) {
        formatted = 'Matured';
    }
    else if (days > 0) {
        formatted = `${days}d ${hours}h ${minutes}m`;
    }
    else if (hours > 0) {
        formatted = `${hours}h ${minutes}m ${seconds}s`;
    }
    else if (minutes > 0) {
        formatted = `${minutes}m ${seconds}s`;
    }
    else {
        formatted = `${seconds}s`;
    }
    return {
        remainingSeconds,
        days,
        hours,
        minutes,
        seconds,
        isMatured,
        formatted,
    };
}
