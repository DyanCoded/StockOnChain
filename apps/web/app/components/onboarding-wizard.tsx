"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button, ErrorState, Toast } from "./design-system";

const sample = {
  email: "member@example.test",
  phone: "+27000000000",
  idNumber: "9001015000085",
  code: "123456",
} as const;

const copy = {
  en: {
    title: "Create your account",
    subtitle:
      "Three short steps using sample details only. No message is sent and no personal data leaves this browser.",
    steps: ["Your contact", "Privacy and checks", "Result"],
    stepLabel: "Screen",
    contactTitle: "Where should your demo confirmation appear?",
    email: "Email",
    phone: "Mobile number",
    contactLabel: "Email or mobile number",
    contactHelp:
      "Use only member@example.test or +27000000000. These are sample values; no email or SMS is sent.",
    continue: "Continue",
    privacyTitle: "Privacy and demo checks",
    privacyIntro:
      "This simulated check looks only at sample formats. It does not verify your identity or contact an outside service.",
    privacyNotice:
      "POPIA privacy notice: sample details are checked in this browser only. They are not sent, logged, or saved. Do not enter real personal information.",
    idLabel: "13-digit sample identity number",
    idHelp: "Use the displayed sample number only.",
    codeLabel: "Six-digit demo code",
    codeHelp:
      "No code is sent. The sample code is shown here for this simulation.",
    consent:
      "I have read this privacy notice and agree to run the synthetic demo check.",
    check: "Check sample details",
    back: "Back",
    contactError:
      "Use one of the sample contact details shown here. Nothing was sent.",
    consentError: "Consent is required before the demo check can run.",
    sampleError:
      "Not verified yet. The details did not match the sample values. Nothing was sent or saved.",
    resultTitle: "Not verified yet",
    resultPassed:
      "The sample checks passed, but no real identity verification or wallet setup took place. This profile cannot hold or send funds.",
    resultFailed:
      "The sample checks did not pass. No personal data was sent or saved. You can try the sample again.",
    duration: "Time for this demo flow",
    recorded:
      "Elapsed time is recorded in this browser session without contact or identity details.",
    restart: "Try the demo again",
    walletNotice: "This prototype does not open a real account or move money.",
  },
  zu: {
    title: "Dala i-akhawunti yakho",
    subtitle:
      "Izinyathelo ezintathu ezimfushane zisebenzisa imininingwane yesampula kuphela. Akukho myalezo othunyelwayo futhi akukho datha yomuntu ephuma kulesi siphequluli.",
    steps: ["Imininingwane yokuxhumana", "Ubumfihlo nokuhlola", "Umphumela"],
    stepLabel: "Isikrini",
    contactTitle: "Isiqinisekiso sesivivinyo kufanele sivele kuphi?",
    email: "I-imeyili",
    phone: "Inombolo yeselula",
    contactLabel: "I-imeyili noma inombolo yeselula",
    contactHelp:
      "Sebenzisa kuphela u-member@example.test noma u-+27000000000. Lezi izinombolo zesampula; akukho imeyili noma i-SMS ethunyelwayo.",
    continue: "Qhubeka",
    privacyTitle: "Ubumfihlo nokuhlola kwesivivinyo",
    privacyIntro:
      "Lokhu kuhlola okulingisiwe kubheka amafomethi esampula kuphela. Akuqinisekisi ubuwena futhi akuxhumani nenye insizakalo.",
    privacyNotice:
      "Isaziso sobumfihlo se-POPIA: imininingwane yesampula ihlolwa kulesi siphequluli kuphela. Ayithunyelwa, ayibhalwa kumalogi, futhi ayigcinwa. Ungafaki imininingwane yakho yangempela.",
    idLabel: "Inombolo kamazisi yesampula enamadijithi ayi-13",
    idHelp: "Sebenzisa inombolo yesampula ebonisiwe kuphela.",
    codeLabel: "Ikhodi yesivivinyo enamadijithi ayisithupha",
    codeHelp:
      "Ayikho ikhodi ethunyelwayo. Ikhodi yesampula iboniswe lapha kulesi sivivinyo.",
    consent:
      "Ngisifundile lesi saziso sobumfihlo futhi ngiyavuma ukuhlola isivivinyo sedatha yokwenziwa.",
    check: "Hlola imininingwane yesampula",
    back: "Emuva",
    contactError:
      "Sebenzisa eyodwa yemininingwane yesampula eboniswe lapha. Akukho okuthunyelwe.",
    consentError: "Kudingeka imvume ngaphambi kokuhlola kwesivivinyo.",
    sampleError:
      "Awukaqinisekiswa. Imininingwane ayihambisani nesampula. Akukho okuthunyelwe noma okugciniwe.",
    resultTitle: "Awukaqinisekiswa",
    resultPassed:
      "Ukuhlolwa kwesampula kuphumelele, kodwa akukho kuqinisekiswa kobuwena bangempela noma ukusethwa kwesikhwama okwenzekile. Le phrofayela ayikwazi ukugcina noma ukuthumela imali.",
    resultFailed:
      "Ukuhlolwa kwesampula akuphumelelanga. Akukho datha yomuntu ethunyelwe noma egciniwe. Ungazama isampula futhi.",
    duration: "Isikhathi salesi sivivinyo",
    recorded:
      "Isikhathi esidlulile sigcinwa kulesi siphequluli kuphela, ngaphandle kwemininingwane yokuxhumana noma kamazisi.",
    restart: "Phinda uzame isivivinyo",
    walletNotice:
      "Lesi sivivinyo asivuli i-akhawunti yangempela futhi asihambisi mali.",
  },
} as const;

type Locale = keyof typeof copy;
type ContactMethod = "email" | "phone";
type Outcome = "passed" | "failed";

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export default function OnboardingWizard({
  locale,
  initialContactMethod,
  initialStep,
}: {
  locale: Locale;
  initialContactMethod: ContactMethod;
  initialStep: 1 | 2;
}) {
  const text = copy[locale];
  const startedAt = useRef<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [contactMethod, setContactMethod] =
    useState<ContactMethod>(initialContactMethod);
  const [contact, setContact] = useState<string>(
    initialContactMethod === "email" ? sample.email : sample.phone,
  );
  const [idNumber, setIdNumber] = useState<string>(sample.idNumber);
  const [code, setCode] = useState<string>(sample.code);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("failed");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    try {
      const landingStart = Number(
        sessionStorage.getItem("stockonchain-onboarding-started-at"),
      );
      startedAt.current =
        Number.isFinite(landingStart) && landingStart > 0
          ? landingStart
          : Date.now();
      sessionStorage.removeItem("stockonchain-onboarding-started-at");
    } catch {
      startedAt.current = Date.now();
    }
  }, []);

  function startFlow() {
    if (startedAt.current === null) startedAt.current = Date.now();
  }

  function continueToPrivacy() {
    if (startedAt.current === null) startFlow();
    const expectedContact =
      contactMethod === "email" ? sample.email : sample.phone;
    if (contact.trim() !== expectedContact) {
      setError(text.contactError);
      return;
    }
    setError(null);
    setStep(2);
  }

  function finishDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setError(text.consentError);
      return;
    }

    const passed =
      /^\d{13}$/.test(idNumber) &&
      idNumber === sample.idNumber &&
      /^\d{6}$/.test(code) &&
      code === sample.code;
    const duration = Math.round(Date.now() - (startedAt.current ?? Date.now()));
    setOutcome(passed ? "passed" : "failed");
    setElapsedMs(duration);
    setError(null);
    setStep(3);

    try {
      sessionStorage.setItem(
        "stockonchain-demo-onboarding-metric",
        JSON.stringify({
          durationMs: duration,
          outcome: passed ? "sample_passed" : "sample_failed",
          screens: 3,
        }),
      );
    } catch {
      // Timing remains visible for this page view if storage is unavailable.
    }
  }

  function restartDemo() {
    startedAt.current = null;
    setStep(1);
    setIdNumber(sample.idNumber);
    setCode(sample.code);
    setConsent(false);
    setError(null);
  }

  const backHref = locale === "zu" ? "/zu" : "/";

  return (
    <main className="shell onboarding-page">
      <header className="topbar">
        <a className="brand" href={backHref}>
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <span>StockOnChain</span>
        </a>
        <span className="status">
          <span aria-hidden="true" />
          {text.stepLabel} {step} of 3
        </span>
      </header>

      <section
        className="onboarding-content"
        aria-labelledby="onboarding-title"
        data-onboarding-ready={isReady}
      >
        <nav className="onboarding-progress" aria-label="Sign-up progress">
          <ol>
            {text.steps.map((label, index) => (
              <li
                key={label}
                aria-current={step === index + 1 ? "step" : undefined}
              >
                <span aria-hidden="true">{index + 1}</span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </nav>
        <h1 id="onboarding-title">{text.title}</h1>
        <p className="onboarding-subtitle">{text.subtitle}</p>
        <Toast title={locale === "zu" ? "Isivivinyo kuphela" : "Demo only"}>
          {text.walletNotice}
        </Toast>

        {step === 1 && (
          <section aria-labelledby="contact-title" className="onboarding-panel">
            <h2 id="contact-title">{text.contactTitle}</h2>
            <fieldset className="contact-methods">
              <legend>
                {locale === "zu" ? "Indlela yokuxhumana" : "Contact method"}
              </legend>
              <label>
                <input
                  type="radio"
                  name="contact-method"
                  value="email"
                  checked={contactMethod === "email"}
                  onChange={() => {
                    setContactMethod("email");
                    setContact(sample.email);
                  }}
                />
                {text.email}
              </label>
              <label>
                <input
                  type="radio"
                  name="contact-method"
                  value="phone"
                  checked={contactMethod === "phone"}
                  onChange={() => {
                    setContactMethod("phone");
                    setContact(sample.phone);
                  }}
                />
                {text.phone}
              </label>
            </fieldset>
            <label className="onboarding-field" htmlFor="signup-contact">
              {text.contactLabel}
            </label>
            <input
              id="signup-contact"
              className="onboarding-input"
              type={contactMethod === "email" ? "email" : "tel"}
              autoComplete="off"
              readOnly
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              aria-describedby="contact-help"
              required
            />
            <p id="contact-help" className="field-help">
              {text.contactHelp}
            </p>
            {error && (
              <ErrorState
                title={
                  locale === "zu"
                    ? "Hlola imininingwane"
                    : "Check the sample details"
                }
              >
                {error}
              </ErrorState>
            )}
            <Button type="button" onClick={continueToPrivacy}>
              {text.continue}
            </Button>
          </section>
        )}

        {step === 2 && (
          <form
            onSubmit={finishDemo}
            className="onboarding-panel"
            aria-labelledby="privacy-title"
          >
            <h2 id="privacy-title">{text.privacyTitle}</h2>
            <p>{text.privacyIntro}</p>
            <Toast
              title={locale === "zu" ? "Isaziso sobumfihlo" : "Privacy notice"}
            >
              {text.privacyNotice}
            </Toast>
            <label className="onboarding-field" htmlFor="contact-review">
              {text.contactLabel}
            </label>
            <input
              id="contact-review"
              className="onboarding-input"
              type="text"
              value={contact}
              readOnly
            />
            <label className="onboarding-field" htmlFor="sample-id">
              {text.idLabel}
            </label>
            <input
              id="sample-id"
              className="onboarding-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              readOnly
              maxLength={13}
              pattern="[0-9]{13}"
              value={idNumber}
              onChange={(event) => setIdNumber(event.target.value)}
              aria-describedby="sample-id-help"
              required
            />
            <p id="sample-id-help" className="field-help">
              {text.idHelp}
            </p>
            <label className="onboarding-field" htmlFor="sample-code">
              {text.codeLabel}
            </label>
            <input
              id="sample-code"
              className="onboarding-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              aria-describedby="sample-code-help"
              required
            />
            <p id="sample-code-help" className="field-help">
              {text.codeHelp} Sample: {sample.code}
            </p>
            <label className="consent-check" htmlFor="privacy-consent">
              <input
                id="privacy-consent"
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              <span>{text.consent}</span>
            </label>
            {error && (
              <ErrorState
                title={
                  locale === "zu"
                    ? "Hlola imininingwane"
                    : "Check the sample details"
                }
              >
                {error}
              </ErrorState>
            )}
            <div className="onboarding-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
              >
                {text.back}
              </Button>
              <Button type="submit" disabled={!consent}>
                {text.check}
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <section
            className="onboarding-panel"
            aria-labelledby="result-title"
            aria-live="polite"
          >
            <ErrorState title={text.resultTitle}>
              {outcome === "passed" ? text.resultPassed : text.resultFailed}
            </ErrorState>
            <dl className="onboarding-result">
              <div>
                <dt>{text.duration}</dt>
                <dd>{formatDuration(elapsedMs)}</dd>
              </div>
              <div>
                <dt>{locale === "zu" ? "Isimo" : "Status"}</dt>
                <dd>{text.resultTitle}</dd>
              </div>
            </dl>
            <p className="field-help">{text.recorded}</p>
            <Button type="button" variant="secondary" onClick={restartDemo}>
              {text.restart}
            </Button>
          </section>
        )}
      </section>
    </main>
  );
}
