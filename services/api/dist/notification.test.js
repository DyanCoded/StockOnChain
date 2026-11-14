"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_os_1 = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = require("node:fs");
const notification_service_js_1 = require("./notification-service.js");
const notification_templates_js_1 = require("./notification-templates.js");
(0, node_test_1.default)("Notification templates - Kea copy includes clear purpose, amounts, and explicit STOP keyword", () => {
    const reminderEn = (0, notification_templates_js_1.renderNotificationMessage)("contribution_reminder", {
        potName: "Umgalelo Pot A",
        amountRand: "250.00",
        dueDate: "25 Nov 2026",
    });
    strict_1.default.match(reminderEn, /StockOnChain: Reminder for your Umgalelo Pot A/);
    strict_1.default.match(reminderEn, /R 250.00/);
    strict_1.default.match(reminderEn, /Reply STOP to opt out/);
    const maturityEn = (0, notification_templates_js_1.renderNotificationMessage)("approaching_maturity", {
        potName: "Umgalelo Pot A",
        daysRemaining: 3,
    });
    strict_1.default.match(maturityEn, /matures in 3 days/);
    strict_1.default.match(maturityEn, /Reply STOP to opt out/);
    const payoutEn = (0, notification_templates_js_1.renderNotificationMessage)("payout_ready", {
        payoutAmountRand: "1050.00",
    });
    strict_1.default.match(payoutEn, /Payout ready!/);
    strict_1.default.match(payoutEn, /R 1050.00 is now available/);
    strict_1.default.match(payoutEn, /Reply STOP to opt out/);
    // Zulu templates
    const reminderZu = (0, notification_templates_js_1.renderNotificationMessage)("contribution_reminder", { potName: "Pot Ekhethekile", amountRand: "500.00" }, "zu");
    strict_1.default.match(reminderZu, /Isikhumbuzo se-pot yakho/);
    strict_1.default.match(reminderZu, /Phendula nge-STOP ukuze umise imilayezo/);
});
(0, node_test_1.default)("Phone hashing - normalizes phone and guarantees zero raw phone numbers stored", () => {
    const hash1 = (0, notification_service_js_1.hashPhoneNumber)("082 000 0000");
    const hash2 = (0, notification_service_js_1.hashPhoneNumber)("+27820000000");
    const hash3 = (0, notification_service_js_1.hashPhoneNumber)("0820000000");
    strict_1.default.equal(hash1, hash2);
    strict_1.default.equal(hash2, hash3);
    strict_1.default.equal(hash1.length, 64); // SHA-256 hex string
    strict_1.default.doesNotMatch(hash1, /0820000000/);
});
(0, node_test_1.default)("Phone OTP linking & Outbound dispatch - verifies phone and records dispatches without PII", () => {
    const tempFile = node_path_1.default.join((0, node_os_1.tmpdir)(), `test-notifs-${Date.now()}.json`);
    try {
        const service = new notification_service_js_1.NotificationService(tempFile);
        // Link phone via OTP (T-03 integration)
        const linkRes = service.linkPhoneWithOtp({
            phone: "0820000000",
            otp: "123456",
            account: "GA111111111111111111111111111111111111111111111111111111",
        });
        strict_1.default.equal(linkRes.success, true);
        strict_1.default.ok(linkRes.phoneHash);
        // Dispatch WhatsApp notification
        const waRes = service.dispatchOutbound({
            phone: "0820000000",
            channel: "whatsapp",
            type: "contribution_reminder",
            templateParams: {
                potName: "Pot 1",
                amountRand: "200.00",
            },
        });
        strict_1.default.equal(waRes.status, "dispatched");
        strict_1.default.equal(waRes.channel, "whatsapp");
        strict_1.default.equal(waRes.inAppFallbackCreated, true);
        // Dispatch SMS notification
        const smsRes = service.dispatchOutbound({
            phone: "0820000000",
            channel: "sms",
            type: "payout_ready",
            templateParams: {
                payoutAmountRand: "1200.00",
            },
        });
        strict_1.default.equal(smsRes.status, "dispatched");
        strict_1.default.equal(smsRes.channel, "sms");
        // Check disk storage to ensure ZERO PII is written (POPIA check)
        const storedRaw = (0, node_fs_1.readFileSync)(tempFile, "utf8");
        strict_1.default.doesNotMatch(storedRaw, /0820000000/);
        strict_1.default.doesNotMatch(storedRaw, /\+27820000000/);
        strict_1.default.doesNotMatch(storedRaw, /123456/); // No raw OTP
    }
    finally {
        try {
            (0, node_fs_1.rmSync)(tempFile, { force: true });
        }
        catch { }
    }
});
(0, node_test_1.default)("STOP keyword opt-out mechanism - immediately honors STOP and suppresses external messages with in-app fallback", () => {
    const tempFile = node_path_1.default.join((0, node_os_1.tmpdir)(), `test-optout-${Date.now()}.json`);
    try {
        const service = new notification_service_js_1.NotificationService(tempFile);
        // User initially not opted out
        strict_1.default.equal(service.isOptedOut("0830000000"), false);
        // User sends STOP
        const stopRes = service.handleKeyword("0830000000", "STOP");
        strict_1.default.equal(stopRes.optedOut, true);
        strict_1.default.match(stopRes.replyMessage, /unsubscribed from SMS & WhatsApp notifications/);
        strict_1.default.equal(service.isOptedOut("0830000000"), true);
        // Attempting to dispatch SMS after STOP MUST suppress SMS
        const dispatchAfterStop = service.dispatchOutbound({
            phone: "0830000000",
            channel: "sms",
            type: "approaching_maturity",
            templateParams: {
                potName: "Stokvel Alpha",
                daysRemaining: 2,
            },
        });
        strict_1.default.equal(dispatchAfterStop.status, "suppressed_opt_out");
        strict_1.default.equal(dispatchAfterStop.inAppFallbackCreated, true);
        // Verify in-app notifications still receive the alert
        const inAppList = service.getInAppNotifications("0830000000");
        strict_1.default.equal(inAppList.length, 1);
        strict_1.default.equal(inAppList[0].type, "approaching_maturity");
        strict_1.default.match(inAppList[0].message, /matures in 2 days/);
        // User resubscribes with START
        const startRes = service.handleKeyword("0830000000", "START");
        strict_1.default.equal(startRes.optedOut, false);
        strict_1.default.equal(service.isOptedOut("0830000000"), false);
        // Outbound resumes
        const resumeDispatch = service.dispatchOutbound({
            phone: "0830000000",
            channel: "whatsapp",
            type: "payout_ready",
            templateParams: { payoutAmountRand: "500.00" },
        });
        strict_1.default.equal(resumeDispatch.status, "dispatched");
    }
    finally {
        try {
            (0, node_fs_1.rmSync)(tempFile, { force: true });
        }
        catch { }
    }
});
(0, node_test_1.default)("Inbound interactive commands rejection - rejects non-keyword chat commands with roadmap notice", () => {
    const service = new notification_service_js_1.NotificationService();
    strict_1.default.throws(() => service.handleKeyword("0840000000", "BALANCE"), /Interactive inbound chat commands are on future roadmap/);
    strict_1.default.throws(() => service.handleKeyword("0840000000", "HELP ME INVEST"), /Interactive inbound chat commands are on future roadmap/);
});
