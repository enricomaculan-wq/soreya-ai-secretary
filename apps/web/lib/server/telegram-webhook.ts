import { timingSafeEqual } from "node:crypto";

let secretFallbackWarned = false;

export function verifyTelegramWebhookSecret(
  secretHeader: string | null,
  expectedSecret: string | null,
  env: NodeJS.ProcessEnv = process.env,
): { allowed: true; warning?: string } | { allowed: false; reason: string } {
  const globalSecret = env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? null;
  const isProduction = env.NODE_ENV === "production";
  const candidates = [expectedSecret, globalSecret].filter((value): value is string => Boolean(value));

  if (candidates.length === 0) {
    if (isProduction) {
      return { allowed: false, reason: "Missing TELEGRAM_WEBHOOK_SECRET or organization webhook secret." };
    }

    if (!secretFallbackWarned) {
      secretFallbackWarned = true;
      console.warn("Telegram webhook secret validation skipped: no webhook secret is configured.");
    }

    return { allowed: true, warning: "secret_validation_skipped" };
  }

  if (!secretHeader) {
    return { allowed: false, reason: "Missing Telegram webhook secret header." };
  }

  const matched = candidates.some((candidate) => timingSafeStringEqual(secretHeader, candidate));

  if (!matched) {
    return { allowed: false, reason: "Invalid Telegram webhook secret." };
  }

  return { allowed: true };
}

export function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function resetTelegramWebhookWarningsForTests() {
  secretFallbackWarned = false;
}

export function extractTelegramMessage(update: Record<string, unknown>): Record<string, unknown> | null {
  const message = update.message;

  if (message && typeof message === "object" && !Array.isArray(message)) {
    return message as Record<string, unknown>;
  }

  return null;
}

export function extractTelegramBotUserId(update: Record<string, unknown>): string | null {
  const message = extractTelegramMessage(update);

  if (!message) {
    return null;
  }

  const viaBot = message.via_bot;

  if (viaBot && typeof viaBot === "object" && !Array.isArray(viaBot)) {
    const id = (viaBot as { id?: unknown }).id;

    if (typeof id === "number") {
      return String(id);
    }
  }

  return null;
}
