import React from "react";

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionCard({ children, className = "" }) {
  return (
    <section className={`bg-card rounded-2xl border border-border shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">{label}</div>
          <div className="text-xl font-bold text-foreground tracking-tight">{value}</div>
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-2">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="text-center py-12 px-5">
      {Icon && <Icon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {body && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusPill({ children, tone = "muted" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-accent/10 text-accent",
    warning: "bg-orange-100 text-orange-700",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone] || tones.muted}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, className = "" }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`h-2 bg-muted rounded-full overflow-hidden ${className}`}>
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function IconButton({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-95 disabled:opacity-45 disabled:cursor-not-allowed transition-all ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl border border-border bg-card text-foreground font-medium hover:bg-muted transition-colors ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
