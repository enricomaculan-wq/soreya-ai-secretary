import { createHmac, timingSafeEqual } from "node:crypto";

let signatureFallbackWarned = false;

export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  env: NodeJS.ProcessEnv = process.env,
): { allowed: true; warning?: string } | { allowed: false; reason: string } {
  const appSecret = env.WHATSAPP_APP_SECRET?.trim();
  const isProduction = env.NODE_ENV === "production";

  if (!appSecret) {
    if (isProduction) {
      return { allowed: false, reason: "Missing WHATSAPP_APP_SECRET." };
    }

    if (!signatureFallbackWarned) {
      signatureFallbackWarned = true;
      console.warn("WhatsApp webhook signature validation skipped: WHATSAPP_APP_SECRET is not configured.");
    }

    return { allowed: true, warning: "signature_validation_skipped" };
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return { allowed: false, reason: "Missing WhatsApp signature." };
  }

  const receivedSignature = signatureHeader.slice("sha256=".length);
  const expectedSignature = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  if (!timingSafeHexEqual(receivedSignature, expectedSignature)) {
    return { allowed: false, reason: "Invalid WhatsApp signature." };
  }

  return { allowed: true };
}

export function timingSafeHexEqual(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function resetWhatsAppSignatureWarningsForTests() {
  signatureFallbackWarned = false;
}
