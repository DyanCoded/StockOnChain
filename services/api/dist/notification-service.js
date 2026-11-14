"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
exports.hashPhoneNumber = hashPhoneNumber;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const kyc_js_1 = require("./kyc.js");
const notification_templates_js_1 = require("./notification-templates.js");
/**
 * Normalizes phone numbers to standard E.164 (+27...) and computes SHA-256 hash.
 * Guarantees zero raw phone numbers written to disk or logs (POPIA compliance).
 */
function hashPhoneNumber(rawPhone) {
    let clean = rawPhone.replace(/\s+/g, "").trim();
    if (clean.startsWith("0") && clean.length === 10) {
        clean = "+27" + clean.slice(1);
    }
    return (0, node_crypto_1.createHash)("sha256").update(clean).digest("hex");
}
class NotificationService {
    filePath;
    data;
    constructor(filePath) {
        this.filePath =
            filePath ||
                process.env.NOTIFICATION_STATE_PATH?.trim() ||
                node_path_1.default.join(process.cwd(), ".local", "notifications-state.json");
        this.data = this.load();
    }
    load() {
        if (!(0, node_fs_1.existsSync)(this.filePath)) {
            return {
                optedOutHashes: [],
                verifiedPhoneHashes: {},
                dispatches: [],
                inAppFallbacks: [],
            };
        }
        try {
            const raw = (0, node_fs_1.readFileSync)(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            return {
                optedOutHashes: parsed.optedOutHashes || [],
                verifiedPhoneHashes: parsed.verifiedPhoneHashes || {},
                dispatches: parsed.dispatches || [],
                inAppFallbacks: parsed.inAppFallbacks || [],
            };
        }
        catch {
            return {
                optedOutHashes: [],
                verifiedPhoneHashes: {},
                dispatches: [],
                inAppFallbacks: [],
            };
        }
    }
    save() {
        const dir = node_path_1.default.dirname(this.filePath);
        if (!(0, node_fs_1.existsSync)(dir)) {
            (0, node_fs_1.mkdirSync)(dir, { recursive: true });
        }
        (0, node_fs_1.writeFileSync)(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
    }
    /**
     * Links a phone number to an account public key after OTP verification (T-03).
     * Stores strictly the SHA-256 hash of the phone number.
     */
    linkPhoneWithOtp(params) {
        if (!(0, kyc_js_1.validatePhoneNumber)(params.phone)) {
            throw new Error("Invalid South African phone number format.");
        }
        if (!(0, kyc_js_1.validateOtp)(params.otp)) {
            throw new Error("Invalid 6-digit verification code (OTP).");
        }
        const phoneHash = hashPhoneNumber(params.phone);
        this.data.verifiedPhoneHashes[phoneHash] = {
            verifiedAt: Date.now(),
            linkedAccount: params.account,
        };
        this.save();
        return { success: true, phoneHash };
    }
    /**
     * Processes opt-out keyword 'STOP' (or resubscribe 'START').
     * Complies with Section 45 of South African ECT Act & POPIA opt-out rights.
     */
    handleKeyword(rawPhone, keyword) {
        const phoneHash = hashPhoneNumber(rawPhone);
        const normalizedKeyword = keyword.trim().toUpperCase();
        if (normalizedKeyword === "STOP" || normalizedKeyword === "UNSUBSCRIBE") {
            if (!this.data.optedOutHashes.includes(phoneHash)) {
                this.data.optedOutHashes.push(phoneHash);
                this.save();
            }
            return {
                optedOut: true,
                phoneHash,
                replyMessage: (0, notification_templates_js_1.renderNotificationMessage)("opt_out_confirmed"),
            };
        }
        if (normalizedKeyword === "START" || normalizedKeyword === "RESUME") {
            this.data.optedOutHashes = this.data.optedOutHashes.filter((h) => h !== phoneHash);
            this.save();
            return {
                optedOut: false,
                phoneHash,
                replyMessage: (0, notification_templates_js_1.renderNotificationMessage)("opt_in_confirmed"),
            };
        }
        throw new Error(`Unsupported inbound keyword: "${keyword}". Note: Interactive inbound chat commands are on future roadmap. Only STOP or START are accepted.`);
    }
    isOptedOut(phoneOrHash) {
        const phoneHash = phoneOrHash.length === 64 ? phoneOrHash : hashPhoneNumber(phoneOrHash);
        return this.data.optedOutHashes.includes(phoneHash);
    }
    /**
     * Dispatches an outbound notification via WhatsApp or SMS sandbox.
     * If user has opted out via STOP, external dispatch is suppressed and routed to in-app fallback.
     */
    dispatchOutbound(params) {
        if (!(0, kyc_js_1.validatePhoneNumber)(params.phone)) {
            throw new Error("Invalid phone number format for outbound notification.");
        }
        const phoneHash = hashPhoneNumber(params.phone);
        const message = (0, notification_templates_js_1.renderNotificationMessage)(params.type, params.templateParams, params.locale || "en");
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const optedOut = this.isOptedOut(phoneHash);
        // If user has opted out, suppress external SMS/WhatsApp dispatch
        if (optedOut && params.channel !== "in_app") {
            const dispatchRecord = {
                id: notifId,
                recipientHash: phoneHash,
                channel: params.channel,
                type: params.type,
                timestamp: Date.now(),
                status: "suppressed_opt_out",
                simulated: true,
            };
            this.data.dispatches.push(dispatchRecord);
            // Always create in-app fallback so critical pot state updates are not lost
            const fallback = {
                id: `inapp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                recipientHash: phoneHash,
                type: params.type,
                title: this.getTitleForType(params.type),
                message,
                timestamp: Date.now(),
                read: false,
            };
            this.data.inAppFallbacks.push(fallback);
            this.save();
            return {
                success: true,
                notificationId: notifId,
                channel: params.channel,
                recipientHash: phoneHash,
                status: "suppressed_opt_out",
                inAppFallbackCreated: true,
                messageSnippet: message.slice(0, 50) + "...",
                simulated: true,
            };
        }
        // Live Sandbox Dispatch (Mock Twilio / Infobip / WhatsApp Business Sandbox)
        const dispatchRecord = {
            id: notifId,
            recipientHash: phoneHash,
            channel: params.channel,
            type: params.type,
            timestamp: Date.now(),
            status: "dispatched",
            simulated: true,
        };
        this.data.dispatches.push(dispatchRecord);
        // Also persist in-app feed
        const inApp = {
            id: `inapp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            recipientHash: phoneHash,
            type: params.type,
            title: this.getTitleForType(params.type),
            message,
            timestamp: Date.now(),
            read: false,
        };
        this.data.inAppFallbacks.push(inApp);
        this.save();
        return {
            success: true,
            notificationId: notifId,
            channel: params.channel,
            recipientHash: phoneHash,
            status: "dispatched",
            inAppFallbackCreated: true,
            messageSnippet: message.slice(0, 50) + "...",
            simulated: true,
        };
    }
    getInAppNotifications(phoneOrHash) {
        const phoneHash = phoneOrHash.length === 64 ? phoneOrHash : hashPhoneNumber(phoneOrHash);
        return this.data.inAppFallbacks.filter((n) => n.recipientHash === phoneHash);
    }
    getDispatchHistory(phoneOrHash) {
        if (!phoneOrHash)
            return this.data.dispatches;
        const phoneHash = phoneOrHash.length === 64 ? phoneOrHash : hashPhoneNumber(phoneOrHash);
        return this.data.dispatches.filter((d) => d.recipientHash === phoneHash);
    }
    getTitleForType(type) {
        switch (type) {
            case "contribution_reminder":
                return "Stokvel Contribution Reminder";
            case "approaching_maturity":
                return "Pot Approaching Maturity";
            case "payout_ready":
                return "Pot Settled & Payout Ready";
            case "opt_out_confirmed":
                return "Notifications Opted-Out";
            case "opt_in_confirmed":
                return "Notifications Enabled";
        }
    }
}
exports.NotificationService = NotificationService;
