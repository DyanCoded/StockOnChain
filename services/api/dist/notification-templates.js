"use strict";
/**
 * Notification message templates authored by Kea.
 * Supports outbound alerts for contribution reminders, approaching maturity dates, and payout ready statuses.
 * Includes explicit STOP opt-out instructions for compliance with South African ECT Act & POPIA.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_TEMPLATES = void 0;
exports.renderNotificationMessage = renderNotificationMessage;
exports.NOTIFICATION_TEMPLATES = {
    en: {
        contribution_reminder: (p) => `StockOnChain: Reminder for your ${p.potName || "stokvel pot"}. Your contribution of R ${p.amountRand || "0.00"} is due by ${p.dueDate || "the monthly deadline"}. Inspect your pot rules in the app. Reply STOP to opt out.`,
        approaching_maturity: (p) => `StockOnChain: Good news! Your pot "${p.potName || "Savings Pot"}" matures in ${p.daysRemaining !== undefined ? p.daysRemaining : 3} days. The Treasury Bill backing will settle automatically. Reply STOP to opt out.`,
        payout_ready: (p) => `StockOnChain: Payout ready! Your pot has matured and settled. R ${p.payoutAmountRand || "0.00"} is now available for pro-rata claim to your wallet. Open the app to claim your payout. Reply STOP to opt out.`,
        opt_out_confirmed: () => `StockOnChain: You have unsubscribed from SMS & WhatsApp notifications. You will receive in-app notifications only. Reply START to resubscribe at any time.`,
        opt_in_confirmed: () => `StockOnChain: Notifications enabled! You will receive outbound updates for your stokvel savings pots. Reply STOP to opt out.`,
    },
    zu: {
        contribution_reminder: (p) => `StockOnChain: Isikhumbuzo se-pot yakho "${p.potName || "stokvel"}". Umnikelo wakho ka-R ${p.amountRand || "0.00"} udingeka ngo-${p.dueDate || "usuku olunqunyiwe"}. Vula i-app ukuze uhlole. Phendula nge-STOP ukuze umise imilayezo.`,
        approaching_maturity: (p) => `StockOnChain: Izindaba ezimnandi! I-pot yakho "${p.potName || "Savings Pot"}" ifika kuvuthwe ezinsukwini ezingu-${p.daysRemaining !== undefined ? p.daysRemaining : 3}. Vula i-app ukuze ubone. Phendula nge-STOP ukuze umise imilayezo.`,
        payout_ready: (p) => `StockOnChain: Imali yakho isilungile! I-pot ivuthiwe futhi yaqedwa. U-R ${p.payoutAmountRand || "0.00"} usulungele ukukhishwa. Vula i-app ukuze uthole imali yakho. Phendula nge-STOP ukuze umise imilayezo.`,
        opt_out_confirmed: () => `StockOnChain: Ukhishiwe ohlwini lwemilayezo ye-SMS ne-WhatsApp. Uzothola izaziso ku-app kuphela. Phendula nge-START ukuze uphinde ubhalise.`,
        opt_in_confirmed: () => `StockOnChain: Izaziso zivuliwe! Uzothola izibuyekezo ze-stokvel pot yakho. Phendula nge-STOP ukuze umise imilayezo.`,
    },
};
function renderNotificationMessage(type, params = {}, locale = "en") {
    const lang = exports.NOTIFICATION_TEMPLATES[locale] ? locale : "en";
    const templateFn = exports.NOTIFICATION_TEMPLATES[lang][type];
    return templateFn(params);
}
