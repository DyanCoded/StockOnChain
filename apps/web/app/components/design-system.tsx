import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      className={`button button--${variant} ${className}`.trim()}
      {...props}
    />
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`system-card ${className}`.trim()}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

export function Stepper({
  label,
  steps,
}: {
  label: string;
  steps: ReadonlyArray<{ title: string; detail: string; status: string }>;
}) {
  return (
    <ol className="flow-stepper" aria-label={label}>
      {steps.map((step, index) => (
        <li className="flow-step" key={step.title}>
          <span className="flow-step__number" aria-hidden="true">
            {index + 1}
          </span>
          <div className="flow-step__content">
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
            <TransactionStatus label={step.status} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Toast({
  title,
  children,
  variant = "warning",
}: {
  title: string;
  children: ReactNode;
  variant?: "info" | "warning" | "error";
}) {
  return (
    <aside
      className={`toast toast--${variant}`}
      role="status"
      aria-live="polite"
    >
      <strong>{title}</strong>
      <p>{children}</p>
    </aside>
  );
}

export function TransactionStatus({ label }: { label: string }) {
  return (
    <span className="transaction-status">
      <span className="transaction-status__marker" aria-hidden="true">
        !
      </span>
      <span>{label}</span>
    </span>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <h3 id="empty-state-title">{title}</h3>
      <p>{children}</p>
    </section>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <p
      className="loading-state"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="loading-state__marker" aria-hidden="true">
        …
      </span>
      {label}
    </p>
  );
}

export function ErrorState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="error-state" role="alert">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}
