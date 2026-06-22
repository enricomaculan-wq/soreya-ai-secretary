import type { ReactNode } from "react";

export function AppPageShell({ children }: { children: ReactNode }) {
  return <main className="soreya-app-shell min-h-screen">{children}</main>;
}

export function AppPageHeader({
  eyebrow,
  title,
  description,
  badges,
  actions,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="soreya-app-header">
      <div className="soreya-container-narrow !py-0">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
            {eyebrow ? <p className={`soreya-eyebrow ${badges ? "mt-4" : ""}`}>{eyebrow}</p> : null}
            <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              {title}
            </h1>
            {description ? <p className="soreya-lead mt-3">{description}</p> : null}
            {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function AppPageBody({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`${wide ? "soreya-container" : "soreya-container-narrow"} soreya-app-body`}>
      {children}
    </div>
  );
}

export function WorkspacePanel({
  title,
  description,
  children,
  accent,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  accent?: "trust" | "neutral";
  className?: string;
}) {
  return (
    <section className={`soreya-workspace-panel ${className}`}>
      <div className={`soreya-workspace-panel-header ${accent === "trust" ? "soreya-workspace-panel-header-trust" : ""}`}>
        <h2 className="text-[15px] font-medium tracking-[-0.02em] text-[var(--foreground)]">{title}</h2>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-subtle)]">{description}</p> : null}
      </div>
      <div className="soreya-workspace-panel-body">{children}</div>
    </section>
  );
}

export function SettingsGroup({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`soreya-settings-group ${className}`}>
      <div className="soreya-settings-group-head">
        <h2 className="text-[15px] font-medium tracking-[-0.02em] text-[var(--foreground)]">{title}</h2>
        {description ? <p className="mt-1 text-[13px] text-[var(--ink-subtle)]">{description}</p> : null}
      </div>
      <div className="soreya-settings-group-body">{children}</div>
    </section>
  );
}

export function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="soreya-metric-tile">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ink-subtle)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{value}</p>
      {detail ? <p className="mt-1 text-[12px] text-[var(--ink-subtle)]">{detail}</p> : null}
    </div>
  );
}
