import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  meta,
  children,
  bodyless,
}: {
  title?: string;
  subtitle?: string;
  meta?: ReactNode;
  children: ReactNode;
  /** Set when the child renders its own padding (lists, split panes). */
  bodyless?: boolean;
}) {
  return (
    <section className="card">
      {title && (
        <header className="card-header">
          <div>
            <h2 className="card-title">{title}</h2>
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {meta && <div className="card-meta">{meta}</div>}
        </header>
      )}
      {bodyless ? children : <div className="card-body">{children}</div>}
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "danger" | "warn" | "ok";
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value${tone ? ` tone-${tone}` : ""}`}>{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <div className="state">{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state">
      <p className="state-title">Something went wrong</p>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  busy,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction} disabled={busy}>
          {busy ? "Working…" : actionLabel}
        </button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {meta && <div className="page-meta">{meta}</div>}
    </header>
  );
}

/** "2026-08-10" -> "Week of 10 Aug 2026", without pulling in a date library. */
export function formatWeek(weekStart: string): string {
  const parsed = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return weekStart;
  return `Week of ${parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}
