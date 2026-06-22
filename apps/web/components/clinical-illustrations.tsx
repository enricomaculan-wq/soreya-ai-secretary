import type { ReactNode } from "react";

type ClinicalIllustrationProps = {
  variant: ClinicalIllustrationVariant;
  className?: string;
  size?: number;
};

export type ClinicalIllustrationVariant =
  | "unified-inbox"
  | "approvals"
  | "daily-summary"
  | "emergency"
  | "quick-call"
  | "mobile-app"
  | "trust-control"
  | "trust-data"
  | "trust-setup"
  | "engine-read"
  | "engine-calendar";

const stroke = "currentColor";

export function ClinicalIllustration({ variant, className = "", size = 40 }: ClinicalIllustrationProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 40 40"
      width={size}
    >
      {illustrations[variant]}
    </svg>
  );
}

const illustrations: Record<ClinicalIllustrationVariant, ReactNode> = {
  "unified-inbox": (
    <>
      <rect fill="rgba(13,148,136,0.08)" height="28" rx="6" stroke={stroke} strokeWidth="1.25" width="24" x="8" y="6" />
      <path d="M12 14h16M12 18h12M12 22h14" stroke={stroke} strokeLinecap="round" strokeWidth="1.25" />
      <circle cx="30" cy="12" fill="rgba(94,234,212,0.35)" r="5" stroke={stroke} strokeWidth="1.1" />
      <path d="M28 12h4M30 10v4" stroke={stroke} strokeLinecap="round" strokeWidth="1" />
    </>
  ),
  approvals: (
    <>
      <rect fill="rgba(13,148,136,0.06)" height="26" rx="4" stroke={stroke} strokeWidth="1.25" width="20" x="10" y="7" />
      <path d="M14 13h12M14 17h9M14 21h11" stroke={stroke} strokeLinecap="round" strokeWidth="1.1" />
      <circle cx="28" cy="26" fill="rgba(94,234,212,0.3)" r="6" stroke={stroke} strokeWidth="1.2" />
      <path d="M25.5 26l1.8 1.8 3.7-3.8" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
    </>
  ),
  "daily-summary": (
    <>
      <rect fill="rgba(13,148,136,0.06)" height="24" rx="4" stroke={stroke} strokeWidth="1.25" width="26" x="7" y="8" />
      <path d="M7 14h26M14 8v4M26 8v4" stroke={stroke} strokeLinecap="round" strokeWidth="1.1" />
      <circle cx="14" cy="20" fill="rgba(94,234,212,0.25)" r="2.5" />
      <circle cx="20" cy="24" fill="rgba(94,234,212,0.18)" r="2.5" />
      <circle cx="26" cy="20" fill="rgba(94,234,212,0.25)" r="2.5" />
    </>
  ),
  emergency: (
    <>
      <path d="M20 6 32 32H8L20 6z" fill="rgba(251,191,36,0.12)" stroke={stroke} strokeLinejoin="round" strokeWidth="1.25" />
      <path d="M20 14v8" stroke={stroke} strokeLinecap="round" strokeWidth="1.5" />
      <circle cx="20" cy="26" fill={stroke} r="1.2" />
    </>
  ),
  "quick-call": (
    <>
      <rect fill="rgba(13,148,136,0.08)" height="18" rx="5" stroke={stroke} strokeWidth="1.25" width="14" x="13" y="8" />
      <path d="M17 26h6" stroke={stroke} strokeLinecap="round" strokeWidth="1.2" />
      <path d="M8 22c2-4 6-6 12-6s10 2 12 6" stroke={stroke} strokeLinecap="round" strokeWidth="1.2" />
      <path d="M10 18c1.5-2 4-3 10-3s8.5 1 10 3" stroke="rgba(94,234,212,0.9)" strokeLinecap="round" strokeWidth="1.1" />
    </>
  ),
  "mobile-app": (
    <>
      <rect fill="rgba(13,148,136,0.06)" height="28" rx="6" stroke={stroke} strokeWidth="1.25" width="16" x="12" y="6" />
      <path d="M18 30h4" stroke={stroke} strokeLinecap="round" strokeWidth="1.2" />
      <rect fill="rgba(94,234,212,0.2)" height="4" rx="1" stroke={stroke} strokeWidth="0.9" width="8" x="16" y="12" />
      <rect fill="rgba(94,234,212,0.14)" height="3" rx="1" width="8" x="16" y="18" />
      <rect fill="rgba(94,234,212,0.14)" height="3" rx="1" width="5" x="16" y="23" />
    </>
  ),
  "trust-control": (
    <>
      <path d="M20 7 30 11v8c0 6.5-4.5 10.5-10 12-5.5-1.5-10-5.5-10-12v-8l10-4z" fill="rgba(13,148,136,0.08)" stroke={stroke} strokeLinejoin="round" strokeWidth="1.25" />
      <path d="M15.5 20.5 18.5 23.5 24.5 17" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
    </>
  ),
  "trust-data": (
    <>
      <rect fill="rgba(13,148,136,0.06)" height="22" rx="3" stroke={stroke} strokeWidth="1.25" width="18" x="11" y="10" />
      <circle cx="20" cy="17" fill="rgba(94,234,212,0.25)" r="3" stroke={stroke} strokeWidth="1" />
      <path d="M14 26c1.5-2 3.5-3 6-3s4.5 1 6 3" stroke={stroke} strokeLinecap="round" strokeWidth="1.1" />
      <rect fill="rgba(13,148,136,0.12)" height="8" rx="2" stroke={stroke} strokeWidth="1" width="10" x="25" y="8" />
    </>
  ),
  "trust-setup": (
    <>
      <circle cx="20" cy="22" fill="rgba(13,148,136,0.06)" r="11" stroke={stroke} strokeWidth="1.25" />
      <path d="M20 14v9l5 3" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
      <circle cx="20" cy="22" fill="rgba(94,234,212,0.35)" r="1.5" />
    </>
  ),
  "engine-read": (
    <>
      <ellipse cx="20" cy="22" fill="rgba(13,148,136,0.08)" rx="11" ry="8" stroke={stroke} strokeWidth="1.2" />
      <path d="M13 22h14" stroke={stroke} strokeLinecap="round" strokeWidth="1.2" />
      <path d="M16 19c2-2 6-2 8 0" stroke="rgba(94,234,212,0.85)" strokeLinecap="round" strokeWidth="1.1" />
    </>
  ),
  "engine-calendar": (
    <>
      <rect fill="rgba(13,148,136,0.06)" height="20" rx="3" stroke={stroke} strokeWidth="1.2" width="22" x="9" y="11" />
      <path d="M9 16h22M14 11v3M26 11v3" stroke={stroke} strokeLinecap="round" strokeWidth="1.1" />
      <rect fill="rgba(94,234,212,0.28)" height="5" rx="1" width="5" x="14" y="20" />
      <rect fill="rgba(94,234,212,0.18)" height="5" rx="1" width="5" x="21" y="20" />
    </>
  ),
};

export const featureIllustrationVariants: ClinicalIllustrationVariant[] = [
  "unified-inbox",
  "approvals",
  "daily-summary",
  "emergency",
  "quick-call",
  "mobile-app",
];

export const trustIllustrationVariants: ClinicalIllustrationVariant[] = [
  "trust-control",
  "trust-data",
  "trust-setup",
];
