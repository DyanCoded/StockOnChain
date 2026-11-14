import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { validatePhoneNumber, validateOtp } from "./kyc.js";
import {
  NotificationType,
  renderNotificationMessage,
  TemplateParams,
} from "./notification-templates.js";

export type NotificationChannel = "whatsapp" | "sms" | "in_app";

export interface NotificationRecord {
  id: string;
  recipientHash: string; // SHA-256 of normalized phone number (NO PII)
  channel: NotificationChannel;
  type: NotificationType;
  timestamp: number;
  status: "dispatched" | "failed" | "suppressed_opt_out";
  simulated: boolean;
}

export interface InAppNotification {
  id: string;
  recipientHash: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface NotificationStoreData {
  optedOutHashes: string[]; // SHA-256 hashes of numbers that sent STOP
  verifiedPhoneHashes: Record<string, { verifiedAt: number; linkedAccount?: string }>;
  dispatches: NotificationRecord[];
  inAppFallbacks: InAppNotification[];
}

export interface DispatchNotificationResult {
  success: boolean;
  notificationId: string;
  channel: NotificationChannel;
  recipientHash: string;
  status: "dispatched" | "suppressed_opt_out";
  inAppFallbackCreated: boolean;
  messageSnippet: string; // Sanitized preview
  simulated: boolean;
}

/**
 * Normalizes phone numbers to standard E.164 (+27...) and computes SHA-256 hash.
 * Guarantees zero raw phone numbers written to disk or logs (POPIA compliance).
 */
export function hashPhoneNumber(rawPhone: string): string {
  let clean = rawPhone.replace(/\s+/g, "").trim();
  if (clean.startsWith("0") && clean.length === 10) {
    clean = "+27" + clean.slice(1);
  }
  return createHash("sha256").update(clean).digest("hex");
}

export class NotificationService {
  private filePath: string;
  private data: NotificationStoreData;

  constructor(filePath?: string) {
    this.filePath =
      filePath ||
      process.env.NOTIFICATION_STATE_PATH?.trim() ||
      path.join(process.cwd(), ".local", "notifications-state.json");
    this.data = this.load();
  }

  private load(): NotificationStoreData {
    if (!existsSync(this.filePath)) {
      return {
        optedOutHashes: [],
        verifiedPhoneHashes: {},
        dispatches: [],
        inAppFallbacks: [],
      };
    }
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<NotificationStoreData>;
      return {
        optedOutHashes: parsed.optedOutHashes || [],
        verifiedPhoneHashes: parsed.verifiedPhoneHashes || {},
        dispatches: parsed.dispatches || [],
        inAppFallbacks: parsed.inAppFallbacks || [],
      };
    } catch {
      return {
        optedOutHashes: [],
        verifiedPhoneHashes: {},
        dispatches: [],
        inAppFallbacks: [],
      };
    }
  }

  private save(): void {
    const dir = path.dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  /**
   * Links a phone number to an account public key after OTP verification (T-03).
   * Stores strictly the SHA-256 hash of the phone number.
   */
  public linkPhoneWithOtp(params: {
    phone: string;
    otp: string;
    account?: string;
  }): { success: boolean; phoneHash: string } {
    if (!validatePhoneNumber(params.phone)) {
      throw new Error("Invalid South African phone number format.");
    }
    if (!validateOtp(params.otp)) {
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
  public handleKeyword(rawPhone: string, keyword: string): {
    optedOut: boolean;
    phoneHash: string;
    replyMessage: string;
  } {
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
        replyMessage: renderNotificationMessage("opt_out_confirmed"),
      };
    }

    if (normalizedKeyword === "START" || normalizedKeyword === "RESUME") {
      this.data.optedOutHashes = this.data.optedOutHashes.filter(
        (h) => h !== phoneHash,
      );
      this.save();
      return {
        optedOut: false,
        phoneHash,
        replyMessage: renderNotificationMessage("opt_in_confirmed"),
      };
    }

    throw new Error(
      `Unsupported inbound keyword: "${keyword}". Note: Interactive inbound chat commands are on future roadmap. Only STOP or START are accepted.`,
    );
  }

  public isOptedOut(phoneOrHash: string): boolean {
    const phoneHash = phoneOrHash.length === 64 ? phoneOrHash : hashPhoneNumber(phoneOrHash);
    return this.data.optedOutHashes.includes(phoneHash);
  }

  /**
   * Dispatches an outbound notification via WhatsApp or SMS sandbox.
   * If user has opted out via STOP, external dispatch is suppressed and routed to in-app fallback.
   */
  public dispatchOutbound(params: {
    phone: string;
    channel: NotificationChannel;
    type: NotificationType;
    templateParams?: TemplateParams;
    locale?: "en" | "zu";
  }): DispatchNotificationResult {
    if (!validatePhoneNumber(params.phone)) {
      throw new Error("Invalid phone number format for outbound notification.");
    }

    const phoneHash = hashPhoneNumber(params.phone);
    const message = renderNotificationMessage(
      params.type,
      params.templateParams,
      params.locale || "en",
    );
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const optedOut = this.isOptedOut(phoneHash);

    // If user has opted out, suppress external SMS/WhatsApp dispatch
    if (optedOut && params.channel !== "in_app") {
      const dispatchRecord: NotificationRecord = {
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
      const fallback: InAppNotification = {
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
    const dispatchRecord: NotificationRecord = {
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
    const inApp: InAppNotification = {
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

  public getInAppNotifications(phoneOrHash: string): InAppNotification[] {
    const phoneHash = phoneOrHash.length === 64 ? phoneOrHash : hashPhoneNumber(phoneOrHash);
    return this.data.inAppFallbacks.filter((n) => n.recipientHash === phoneHash);
  }

  public getDispatchHistory(phoneOrHash?: string): NotificationRecord[] {
    if (!phoneOrHash) return this.data.dispatches;
    const phoneHash = phoneOrHash.length === 64 ? phoneOrHash : hashPhoneNumber(phoneOrHash);
    return this.data.dispatches.filter((d) => d.recipientHash === phoneHash);
  }

  private getTitleForType(type: NotificationType): string {
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
