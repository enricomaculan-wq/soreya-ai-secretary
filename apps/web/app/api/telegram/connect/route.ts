import { randomBytes } from "node:crypto";

import {
  getConnectedTelegramAccount,
  updateOrganizationTelegramSettings,
  upsertConnectedTelegramAccount,
} from "@soreya/database";

import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { decryptToken, encryptToken } from "@/lib/server/token-encryption";
import {
  getTelegramBotMe,
  jsonError,
  readOptionalString,
  readTelegramBotToken,
  setTelegramWebhook,
} from "@/lib/server/telegram-api";
import { z } from "zod";

export const runtime = "nodejs";

const telegramConnectSchema = z.object({
  botToken: z.string().trim().max(5000).optional().nullable(),
  botUsername: z.string().trim().max(120).optional().nullable(),
  displayName: z.string().trim().max(120).optional().nullable(),
  webhookSecret: z.string().trim().max(240).optional().nullable(),
  enabled: z.boolean().optional(),
});

function createWebhookSecret(existing?: string | null) {
  return existing?.trim() || randomBytes(24).toString("hex");
}

function readWebhookBaseUrl(request: Request) {
  const configured = process.env.TELEGRAM_WEBHOOK_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = telegramConnectSchema.parse(await request.json());
    const organizationId = context.userOrganization.organization.id;
    const existingAccount = await getConnectedTelegramAccount(context.supabase, organizationId);
    const botTokenFromForm = readOptionalString(body.botToken);
    const botToken = botTokenFromForm
      ?? (existingAccount?.accessTokenEncrypted
        ? null
        : readTelegramBotToken());

    if (!botToken && !existingAccount?.accessTokenEncrypted) {
      return Response.json({ error: "botToken is required." }, { status: 400 });
    }

    const resolvedBotToken = botToken
      ?? (existingAccount?.accessTokenEncrypted
        ? decryptToken(existingAccount.accessTokenEncrypted, "TELEGRAM_BOT_TOKEN_ENCRYPTION_KEY")
        : null);

    if (!resolvedBotToken) {
      return Response.json({ error: "Unable to resolve Telegram bot token." }, { status: 400 });
    }

    const botProfile = await getTelegramBotMe(resolvedBotToken);
    const webhookSecret = createWebhookSecret(
      readOptionalString(body.webhookSecret) ?? existingAccount?.webhookSecret,
    );
    const enabled = body.enabled ?? existingAccount?.enabled ?? true;
    const accessTokenEncrypted = botTokenFromForm || !existingAccount?.accessTokenEncrypted
      ? encryptToken(resolvedBotToken, "TELEGRAM_BOT_TOKEN_ENCRYPTION_KEY")
      : existingAccount.accessTokenEncrypted;

    const account = await upsertConnectedTelegramAccount(context.supabase, {
      organizationId,
      ownerUserId: context.user.id,
      botUserId: String(botProfile.id),
      botUsername: readOptionalString(body.botUsername) ?? botProfile.username,
      displayName: readOptionalString(body.displayName) ?? botProfile.firstName,
      webhookSecret,
      enabled,
      accessTokenEncrypted,
      status: enabled ? "active" : "disabled",
      metadata: {
        configuredFrom: "web_dashboard",
      },
    });

    const webhookUrl = `${readWebhookBaseUrl(request)}/api/telegram/webhook`;

    if (enabled) {
      await setTelegramWebhook(resolvedBotToken, webhookUrl, webhookSecret);
    }

    const settingsResult = await updateOrganizationTelegramSettings(context.supabase, organizationId, {
      enabled,
      webhookSecret,
      botTokenEncryptedRef: Boolean(accessTokenEncrypted),
    });

    return Response.json({
      provider: account.provider,
      connected: account.status === "active" && account.enabled,
      botUserId: account.botUserId,
      botUsername: account.botUsername,
      displayName: account.displayName,
      enabled: account.enabled,
      status: account.status,
      lastSyncedAt: account.lastSyncedAt,
      webhookUrl,
      webhookSecret: settingsResult.telegram.webhookSecret,
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function PATCH(request: Request) {
  return POST(request);
}
