"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorState, LoadingState, Toast } from "./design-system";

export interface InAppNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

const copy = {
  en: {
    title: "Member Notifications (WhatsApp & SMS Lite)",
    badge: "OUTBOUND ONLY - POPIA COMPLIANT",
    desc: "Receive automated alerts for contribution reminders, approaching maturity dates, and payout readiness. Reply STOP at any time to opt out.",
    phoneLabel: "Registered Mobile Number (Synthetic)",
    channelLabel: "Preferred Notification Channel",
    typeLabel: "Alert Trigger Type",
    typeReminder: "Contribution Reminder",
    typeMaturity: "Approaching Maturity",
    typePayout: "Payout Ready",
    sendTestButton: "Dispatch Test Alert",
    sending: "Dispatching message...",
    optOutTitle: "Opt-Out & Privacy Preferences",
    optOutDesc:
      "In compliance with POPIA and the ECT Act, you can opt out of external SMS & WhatsApp alerts. Critical pot updates will continue in-app.",
    optOutButton: "Send STOP (Opt Out of SMS/WhatsApp)",
    optInButton: "Send START (Resume Alerts)",
    inAppTitle: "In-App Notification Feed",
    noNotifications: "No notifications received yet.",
    zeroPiiNotice:
      "Privacy Guarantee: Your mobile number is never stored in plaintext or logged. All records are indexed via cryptographic SHA-256 hash.",
    interactiveRoadmapNote:
      "Roadmap Note: Inbound interactive chat commands (e.g. checking balances via WhatsApp) are planned for a future milestone.",
  },
  zu: {
    title: "Izaziso Zelungu (WhatsApp & SMS Lite)",
    badge: "EZIPHUMAYO KUPHELA - POPIA",
    desc: "Thola izaziso ezizenzakalelayo zezikhumbuzo zeminikelo, izinsuku zokuvuthwa, nokulungela kwemali. Phendula nge-STOP ukuze umise imilayezo.",
    phoneLabel: "Inombolo Yeselula (Yokulingisa)",
    channelLabel: "Indlela Yokuthola Izaziso",
    typeLabel: "Uhlobo Lwesaziso",
    typeReminder: "Isikhumbuzo Somnikelo",
    typeMaturity: "Ukuvuthwa Kwe-Pot",
    typePayout: "Imali Isilungile",
    sendTestButton: "Thumela Isaziso Sesivivinyo",
    sending: "Iyathumela...",
    optOutTitle: "Izintandokazi Zobumfihlo Nokumisa Imilayezo",
    optOutDesc:
      "Ngokuhambisana ne-POPIA, ungamisa imilayezo ye-SMS ne-WhatsApp. Izaziso ezibalulekile zizoqhubeka ku-app.",
    optOutButton: "Thumela i-STOP (Misa SMS/WhatsApp)",
    optInButton: "Thumela i-START (Qala Izaziso)",
    inAppTitle: "Uhlu Lwezaziso Ku-App",
    noNotifications: "Azikho izaziso okwamanje.",
    zeroPiiNotice:
      "Ukuvikelwa Kwedatha: Inombolo yakho ayigcinwa ngendlela ecacile noma ibhalwe ezincwadini. Isetshenziswa nge-SHA-256 hash kuphela.",
    interactiveRoadmapNote:
      "Qaphela: Imilayezo yokuxoxa esebenzisanayo nge-WhatsApp izofika ezinhlelweni zesikhathi esizayo.",
  },
} as const;

export default function NotificationManager({
  locale,
  account,
}: {
  locale: "en" | "zu";
  account?: string | null;
}) {
  const text = copy[locale];
  const [phone, setPhone] = useState<string>("0820000000");
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "in_app">(
    "whatsapp",
  );
  const [alertType, setAlertType] = useState<
    "contribution_reminder" | "approaching_maturity" | "payout_ready"
  >("contribution_reminder");
  const [isOptedOut, setIsOptedOut] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [inAppList, setInAppList] = useState<InAppNotificationItem[]>([]);

  function handleSendTest() {
    setIsSending(true);
    setToastMessage(null);

    // Simulate dispatch via API
    setTimeout(() => {
      setIsSending(false);
      const fakeMsg =
        alertType === "contribution_reminder"
          ? `Reminder: Contribution of R 250.00 is due. Reply STOP to opt out.`
          : alertType === "approaching_maturity"
            ? `Your pot matures in 3 days. Reply STOP to opt out.`
            : `Payout ready! R 1,050.00 available to claim. Reply STOP to opt out.`;

      if (isOptedOut && channel !== "in_app") {
        setToastMessage(
          "Alert suppressed on WhatsApp/SMS because you sent STOP. Delivered to in-app feed instead.",
        );
      } else {
        setToastMessage(
          `Dispatched test ${channel.toUpperCase()} message successfully!`,
        );
      }

      setInAppList((prev) => [
        {
          id: `inapp_${Date.now()}`,
          type: alertType,
          title:
            alertType === "contribution_reminder"
              ? "Contribution Reminder"
              : alertType === "approaching_maturity"
                ? "Approaching Maturity"
                : "Payout Ready",
          message: fakeMsg,
          timestamp: Date.now(),
          read: false,
        },
        ...prev,
      ]);
    }, 600);
  }

  function toggleOptOut(optOut: boolean) {
    setIsOptedOut(optOut);
    if (optOut) {
      setToastMessage(
        "STOP registered. You are unsubscribed from SMS & WhatsApp. In-app alerts remain active.",
      );
    } else {
      setToastMessage(
        "START registered. SMS & WhatsApp notifications resumed.",
      );
    }
  }

  return (
    <Card title={text.title} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          {text.badge}
        </span>
      </div>

      <p className="text-sm opacity-80">{text.desc}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1">
            {text.phoneLabel}
          </label>
          <input
            type="text"
            className="w-full text-sm p-2 rounded border border-current/20 bg-transparent font-mono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            {text.channelLabel}
          </label>
          <select
            className="w-full text-sm p-2 rounded border border-current/20 bg-transparent"
            value={channel}
            onChange={(e) =>
              setChannel(e.target.value as "whatsapp" | "sms" | "in_app")
            }
          >
            <option value="whatsapp">WhatsApp Sandbox</option>
            <option value="sms">SMS Sandbox</option>
            <option value="in_app">In-App Feed Only</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            {text.typeLabel}
          </label>
          <select
            className="w-full text-sm p-2 rounded border border-current/20 bg-transparent"
            value={alertType}
            onChange={(e) =>
              setAlertType(
                e.target.value as
                  | "contribution_reminder"
                  | "approaching_maturity"
                  | "payout_ready",
              )
            }
          >
            <option value="contribution_reminder">{text.typeReminder}</option>
            <option value="approaching_maturity">{text.typeMaturity}</option>
            <option value="payout_ready">{text.typePayout}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="primary"
          onClick={handleSendTest}
          disabled={isSending}
        >
          {isSending ? text.sending : text.sendTestButton}
        </Button>
      </div>

      {toastMessage && (
        <Toast title="Notification Update" variant="info">
          {toastMessage}
        </Toast>
      )}

      {/* Opt-Out Controls */}
      <div className="p-3 rounded bg-black/5 dark:bg-white/5 border border-current/10 space-y-2 text-xs">
        <div className="font-semibold text-sm">{text.optOutTitle}</div>
        <p className="opacity-80">{text.optOutDesc}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {!isOptedOut ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => toggleOptOut(true)}
              className="text-xs text-rose-600 dark:text-rose-400"
            >
              {text.optOutButton}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => toggleOptOut(false)}
              className="text-xs text-emerald-600 dark:text-emerald-400"
            >
              {text.optInButton}
            </Button>
          )}
        </div>
      </div>

      {/* In-App Feed */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">{text.inAppTitle}</h3>
        {inAppList.length === 0 ? (
          <p className="text-xs opacity-60 italic">{text.noNotifications}</p>
        ) : (
          <div className="space-y-2">
            {inAppList.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded border border-current/10 bg-black/5 dark:bg-white/5 text-xs space-y-1"
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>{item.title}</span>
                  <span className="opacity-60 text-[10px]">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="opacity-80">{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] opacity-80 space-y-1">
        <p>{text.zeroPiiNotice}</p>
        <p className="italic">{text.interactiveRoadmapNote}</p>
      </div>
    </Card>
  );
}
