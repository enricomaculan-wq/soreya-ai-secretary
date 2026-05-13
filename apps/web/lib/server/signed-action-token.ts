import { createHmac, timingSafeEqual } from "node:crypto";

import type { SmartwatchActionType } from "@soreya/shared";

export type SignedActionTokenPayload = {
  organizationId: string;
  userId: string;
  suggestedActionId?: string | null;
  actionType: SmartwatchActionType;
  deviceId?: string | null;
  expiresAt: number;
};

export type SignedActionTokenVerification =
  | { valid: true; payload: SignedActionTokenPayload }
  | { valid: false; reason: "missing_secret" | "malformed" | "bad_signature" | "expired" };

const DEFAULT_TTL_SECONDS = 300;
const SMARTWATCH_ACTION_TYPES: SmartwatchActionType[] = [
  "quick_approve",
  "quick_ignore",
  "open_mobile",
  "emergency_delay",
  "emergency_reschedule_today",
  "view_daily_summary",
];

export function createSignedActionToken(
  payload: Omit<SignedActionTokenPayload, "expiresAt"> & { expiresAt?: number },
): string {
  const secret = readSignedActionTokenSecret();
  const ttlSeconds = readSignedActionTokenTtlSeconds();
  const normalizedPayload: SignedActionTokenPayload = {
    ...payload,
    suggestedActionId: payload.suggestedActionId ?? null,
    deviceId: payload.deviceId ?? null,
    expiresAt: payload.expiresAt ?? Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(normalizedPayload));
  const signature = sign(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifySignedActionToken(token: string | null | undefined): SignedActionTokenVerification {
  const secret = process.env.SIGNED_ACTION_TOKEN_SECRET?.trim();

  if (!secret) {
    return { valid: false, reason: "missing_secret" };
  }

  if (!token) {
    return { valid: false, reason: "malformed" };
  }

  const [encodedPayload, receivedSignature, extra] = token.split(".");

  if (!encodedPayload || !receivedSignature || extra) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSignature = sign(encodedPayload, secret);

  if (!timingSafeBase64UrlEqual(receivedSignature, expectedSignature)) {
    return { valid: false, reason: "bad_signature" };
  }

  const payload = parsePayload(encodedPayload);

  if (!payload) {
    return { valid: false, reason: "malformed" };
  }

  if (payload.expiresAt <= Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true, payload };
}

export function signedActionTokensConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.SIGNED_ACTION_TOKEN_SECRET?.trim());
}

export function readSignedActionTokenTtlSeconds(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.SIGNED_ACTION_TOKEN_TTL_SECONDS);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_TTL_SECONDS;
}

function readSignedActionTokenSecret(): string {
  const secret = process.env.SIGNED_ACTION_TOKEN_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing SIGNED_ACTION_TOKEN_SECRET.");
  }

  return secret;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function timingSafeBase64UrlEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function parsePayload(encodedPayload: string): SignedActionTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<SignedActionTokenPayload>;

    if (
      typeof parsed.organizationId !== "string"
      || typeof parsed.userId !== "string"
      || typeof parsed.actionType !== "string"
      || !SMARTWATCH_ACTION_TYPES.includes(parsed.actionType as SmartwatchActionType)
      || typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return {
      organizationId: parsed.organizationId,
      userId: parsed.userId,
      suggestedActionId: typeof parsed.suggestedActionId === "string" ? parsed.suggestedActionId : null,
      actionType: parsed.actionType as SmartwatchActionType,
      deviceId: typeof parsed.deviceId === "string" ? parsed.deviceId : null,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}
