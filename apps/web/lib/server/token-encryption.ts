import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const TOKEN_PREFIX = "v1";

export function encryptToken(token: string, envName = "CALENDAR_TOKEN_ENCRYPTION_KEY"): string {
  const key = readEncryptionKey(envName);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [TOKEN_PREFIX, encode(iv), encode(authTag), encode(encrypted)].join(":");
}

export function decryptToken(encryptedToken: string, envName = "CALENDAR_TOKEN_ENCRYPTION_KEY"): string {
  const key = readEncryptionKey(envName);
  const [version, encodedIv, encodedAuthTag, encodedPayload] = encryptedToken.split(":");

  if (version !== TOKEN_PREFIX || !encodedIv || !encodedAuthTag || !encodedPayload) {
    throw new Error("Calendar token has an unsupported encryption format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, decode(encodedIv));
  decipher.setAuthTag(decode(encodedAuthTag));

  return Buffer.concat([decipher.update(decode(encodedPayload)), decipher.final()]).toString("utf8");
}

function readEncryptionKey(envName: string): Buffer {
  const secret = process.env[envName];

  if (!secret) {
    throw new Error(`Missing ${envName}. Provider tokens cannot be stored or read.`);
  }

  return createHash("sha256").update(secret).digest();
}

function encode(value: Buffer): string {
  return value.toString("base64url");
}

function decode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}
