import Link from "next/link";
import type { ReactNode } from "react";

type BadgeTone = "trust" | "neutral" | "info" | "warning";

const badgeToneClass: Record<BadgeTone, string> = {
  trust: "soreya-badge-trust",
  neutral: "soreya-badge-neutral",
  info: "soreya-badge-info",
  warning: "soreya-badge-warning",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`soreya-badge ${badgeToneClass[tone]}`}>{children}</span>;
}

export function Card({
  children,
  className = "",
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return <section className={`${muted ? "soreya-card-muted" : "soreya-card"} ${className}`}>{children}</section>;
}

export function PageHero({
  eyebrow,
  title,
  description,
  badges,
  actions,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`soreya-card p-6 sm:p-8 ${className}`}>
      {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
      {eyebrow ? <p className={`soreya-eyebrow ${badges ? "mt-4" : ""}`}>{eyebrow}</p> : null}
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-4xl">{title}</h1>
      {description ? <p className="soreya-lead mt-4 max-w-3xl">{description}</p> : null}
      {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  centered = false,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow ? <p className={dark ? "soreya-hero-eyebrow" : "soreya-eyebrow"}>{eyebrow}</p> : null}
      <h2
        className={`mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl ${
          dark ? "text-[var(--hero-text)]" : "text-[var(--foreground)]"
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p className={`mt-4 text-[0.9375rem] leading-relaxed ${dark ? "soreya-hero-lead" : "soreya-lead"}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  href,
  onClick,
  type = "button",
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  variant?: "default" | "trust" | "hero" | "hero-ghost";
}) {
  const classes = `${
    variant === "trust"
      ? "soreya-btn-trust"
      : variant === "hero"
        ? "soreya-btn-hero"
        : variant === "hero-ghost"
          ? "soreya-btn-hero-ghost"
          : "soreya-btn-primary"
  } ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  href,
  onClick,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}) {
  const classes = `soreya-btn-secondary ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick} type={type}>
      {children}
    </button>
  );
}
