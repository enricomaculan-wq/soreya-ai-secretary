export const SOREYA_DEEP_LINKS = {
  approvals: "soreya://approvals",
  dailySummary: "soreya://daily-summary",
  emergency: "soreya://emergency",
  quickCall: "soreya://quick-call",
} as const;

export type SoreyaDeepLink = (typeof SOREYA_DEEP_LINKS)[keyof typeof SOREYA_DEEP_LINKS];
