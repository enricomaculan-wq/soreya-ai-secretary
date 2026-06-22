export function normalizeWhatsAppRecipient(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    throw new Error("WhatsApp recipient phone number is missing.");
  }

  return digits;
}
