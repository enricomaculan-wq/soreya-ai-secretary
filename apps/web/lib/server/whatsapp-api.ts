import { NextResponse } from "next/server";

export function jsonError(error: unknown, status = 500) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status },
  );
}

export function readWhatsAppWebhookVerifyToken() {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!token) {
    throw new Error("Missing WHATSAPP_VERIFY_TOKEN.");
  }

  return token;
}

export function readWhatsAppAccessToken(inputToken?: string | null) {
  const token = inputToken?.trim() || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!token) {
    throw new Error("Missing WhatsApp access token. Provide accessToken or set WHATSAPP_ACCESS_TOKEN.");
  }

  return token;
}

export function readWhatsAppApiVersion() {
  return process.env.WHATSAPP_CLOUD_API_VERSION ?? "v23.0";
}

export function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
