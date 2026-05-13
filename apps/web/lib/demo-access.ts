export const DEMO_ACCESS_COOKIE = "soreya_demo_access";
export const DEMO_ACCESS_GRANTED_VALUE = "granted";
export const DEMO_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const protectedPagePaths = ["/app", "/settings"];
const protectedApiPrefixes = [
  "/api/demo",
  "/api/approvals",
  "/api/execution",
  "/api/quick-call",
  "/api/emergency",
  "/api/daily-summary",
];

export function readDemoAccessPassword() {
  return process.env.DEMO_ACCESS_PASSWORD?.trim() || null;
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

export function isDemoAccessConfigured() {
  return Boolean(readDemoAccessPassword());
}

export function shouldBypassDemoAccessInDevelopment() {
  return !isDemoAccessConfigured() && !isProductionEnvironment();
}

export function hasDemoAccess(cookieValue: string | undefined | null) {
  return cookieValue === DEMO_ACCESS_GRANTED_VALUE;
}

export function isProtectedDemoPath(pathname: string) {
  return isProtectedPagePath(pathname) || isProtectedDemoApiPath(pathname);
}

export function isProtectedPagePath(pathname: string) {
  return protectedPagePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isProtectedDemoApiPath(pathname: string) {
  return protectedApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function safeDemoAccessNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  if (value.startsWith("/api/") || value === "/demo-access" || value.startsWith("/demo-access?")) {
    return "/app";
  }

  return value;
}
