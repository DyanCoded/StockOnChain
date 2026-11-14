import test from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import path from "node:path";
import { rmSync, readFileSync } from "node:fs";
import {
  NotificationService,
  hashPhoneNumber,
} from "./notification-service.js";
import { renderNotificationMessage } from "./notification-templates.js";

test("Notification templates - Kea copy includes clear purpose, amounts, and explicit STOP keyword", () => {
  const reminderEn = renderNotificationMessage("contribution_reminder", {
    potName: "Umgalelo Pot A",
    amountRand: "250.00",
    dueDate: "25 Nov 2026",
  });
  assert.match(reminderEn, /StockOnChain: Reminder for your Umgalelo Pot A/);
  assert.match(reminderEn, /R 250.00/);
  assert.match(reminderEn, /Reply STOP to opt out/);

  const maturityEn = renderNotificationMessage("approaching_maturity", {
    potName: "Umgalelo Pot A",
    daysRemaining: 3,
  });
  assert.match(maturityEn, /matures in 3 days/);
  assert.match(maturityEn, /Reply STOP to opt out/);

  const payoutEn = renderNotificationMessage("payout_ready", {
    payoutAmountRand: "1050.00",
  });
  assert.match(payoutEn, /Payout ready!/);
  assert.match(payoutEn, /R 1050.00 is now available/);
  assert.match(payoutEn, /Reply STOP to opt out/);

  // Zulu templates
  const reminderZu = renderNotificationMessage(
    "contribution_reminder",
    { potName: "Pot Ekhethekile", amountRand: "500.00" },
    "zu",
  );
  assert.match(reminderZu, /Isikhumbuzo se-pot yakho/);
  assert.match(reminderZu, /Phendula nge-STOP ukuze umise imilayezo/);
});

test("Phone hashing - normalizes phone and guarantees zero raw phone numbers stored", () => {
  const hash1 = hashPhoneNumber("082 000 0000");
  const hash2 = hashPhoneNumber("+27820000000");
  const hash3 = hashPhoneNumber("0820000000");

  assert.equal(hash1, hash2);
  assert.equal(hash2, hash3);
  assert.equal(hash1.length, 64); // SHA-256 hex string
  assert.doesNotMatch(hash1, /0820000000/);
});

test("Phone OTP linking & Outbound dispatch - verifies phone and records dispatches without PII", () => {
  const tempFile = path.join(tmpdir(), `test-notifs-${Date.now()}.json`);

  try {
    const service = new NotificationService(tempFile);

    // Link phone via OTP (T-03 integration)
    const linkRes = service.linkPhoneWithOtp({
      phone: "0820000000",
      otp: "123456",
      account: "GA111111111111111111111111111111111111111111111111111111",
    });
    assert.equal(linkRes.success, true);
    assert.ok(linkRes.phoneHash);

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
    assert.equal(waRes.status, "dispatched");
    assert.equal(waRes.channel, "whatsapp");
    assert.equal(waRes.inAppFallbackCreated, true);

    // Dispatch SMS notification
    const smsRes = service.dispatchOutbound({
      phone: "0820000000",
      channel: "sms",
      type: "payout_ready",
      templateParams: {
        payoutAmountRand: "1200.00",
      },
    });
    assert.equal(smsRes.status, "dispatched");
    assert.equal(smsRes.channel, "sms");

    // Check disk storage to ensure ZERO PII is written (POPIA check)
    const storedRaw = readFileSync(tempFile, "utf8");
    assert.doesNotMatch(storedRaw, /0820000000/);
    assert.doesNotMatch(storedRaw, /\+27820000000/);
    assert.doesNotMatch(storedRaw, /123456/); // No raw OTP
  } finally {
    try { rmSync(tempFile, { force: true }); } catch {}
  }
});

test("STOP keyword opt-out mechanism - immediately honors STOP and suppresses external messages with in-app fallback", () => {
  const tempFile = path.join(tmpdir(), `test-optout-${Date.now()}.json`);

  try {
    const service = new NotificationService(tempFile);

    // User initially not opted out
    assert.equal(service.isOptedOut("0830000000"), false);

    // User sends STOP
    const stopRes = service.handleKeyword("0830000000", "STOP");
    assert.equal(stopRes.optedOut, true);
    assert.match(stopRes.replyMessage, /unsubscribed from SMS & WhatsApp notifications/);
    assert.equal(service.isOptedOut("0830000000"), true);

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

    assert.equal(dispatchAfterStop.status, "suppressed_opt_out");
    assert.equal(dispatchAfterStop.inAppFallbackCreated, true);

    // Verify in-app notifications still receive the alert
    const inAppList = service.getInAppNotifications("0830000000");
    assert.equal(inAppList.length, 1);
    assert.equal(inAppList[0].type, "approaching_maturity");
    assert.match(inAppList[0].message, /matures in 2 days/);

    // User resubscribes with START
    const startRes = service.handleKeyword("0830000000", "START");
    assert.equal(startRes.optedOut, false);
    assert.equal(service.isOptedOut("0830000000"), false);

    // Outbound resumes
    const resumeDispatch = service.dispatchOutbound({
      phone: "0830000000",
      channel: "whatsapp",
      type: "payout_ready",
      templateParams: { payoutAmountRand: "500.00" },
    });
    assert.equal(resumeDispatch.status, "dispatched");
  } finally {
    try { rmSync(tempFile, { force: true }); } catch {}
  }
});

test("Inbound interactive commands rejection - rejects non-keyword chat commands with roadmap notice", () => {
  const service = new NotificationService();
  assert.throws(
    () => service.handleKeyword("0840000000", "BALANCE"),
    /Interactive inbound chat commands are on future roadmap/,
  );
  assert.throws(
    () => service.handleKeyword("0840000000", "HELP ME INVEST"),
    /Interactive inbound chat commands are on future roadmap/,
  );
});
