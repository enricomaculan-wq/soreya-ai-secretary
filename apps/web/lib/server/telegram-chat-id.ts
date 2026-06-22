export function normalizeTelegramChatId(value: string | number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^-?\d+$/.test(trimmed)) {
      return trimmed;
    }
  }

  throw new Error("Telegram chat id must be a numeric string.");
}

export function normalizeTelegramRecipient(value: string | number | null | undefined): string {
  return normalizeTelegramChatId(value);
}
