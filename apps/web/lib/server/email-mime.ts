export function buildMimeEmailPlainText(input: {
  fromEmail: string;
  fromName?: string | null;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
}): string {
  const from = input.fromName
    ? `${encodeMimePhrase(input.fromName)} <${input.fromEmail}>`
    : input.fromEmail;
  const lines = [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: ${encodeMimePhrase(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];

  if (input.inReplyTo) {
    lines.push(`In-Reply-To: ${input.inReplyTo}`);
  }

  if (input.references) {
    lines.push(`References: ${input.references}`);
  }

  lines.push("", Buffer.from(input.body, "utf8").toString("base64"));

  return lines.join("\r\n");
}

export function encodeGmailRaw(message: string): string {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeMimePhrase(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) {
    return value;
  }

  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}
