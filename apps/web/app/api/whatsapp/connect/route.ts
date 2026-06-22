import { getConnectedWhatsAppAccount, upsertConnectedWhatsAppAccount } from "@soreya/database";

import { jsonError, readOptionalString, readWhatsAppAccessToken } from "@/lib/server/whatsapp-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";
import { encryptToken } from "@/lib/server/token-encryption";
import { z } from "zod";

export const runtime = "nodejs";

const whatsAppConnectSchema = z.object({
  businessAccountId: z.string().trim().min(1).max(120).optional().nullable(),
  phoneNumberId: z.string().trim().min(1).max(120).optional().nullable(),
  displayPhoneNumber: z.string().trim().max(80).optional().nullable(),
  verifiedName: z.string().trim().max(120).optional().nullable(),
  webhookVerifyToken: z.string().trim().max(240).optional().nullable(),
  accessToken: z.string().trim().max(5000).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = whatsAppConnectSchema.parse(await request.json());
    const businessAccountId = readOptionalString(body.businessAccountId) ?? process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? null;
    const phoneNumberId = readOptionalString(body.phoneNumberId) ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
    const displayPhoneNumber = readOptionalString(body.displayPhoneNumber);
    const verifiedName = readOptionalString(body.verifiedName);
    const webhookVerifyToken = readOptionalString(body.webhookVerifyToken) ?? process.env.WHATSAPP_VERIFY_TOKEN ?? null;
    const accessTokenFromForm = readOptionalString(body.accessToken);
    const existingAccount = await getConnectedWhatsAppAccount(
      context.supabase,
      context.userOrganization.organization.id,
    );
    const accessTokenEncrypted = accessTokenFromForm
      ? encryptToken(readWhatsAppAccessToken(accessTokenFromForm), "WHATSAPP_TOKEN_ENCRYPTION_KEY")
      : existingAccount?.accessTokenEncrypted
        ?? encryptToken(readWhatsAppAccessToken(null), "WHATSAPP_TOKEN_ENCRYPTION_KEY");

    if (!phoneNumberId) {
      return Response.json({ error: "phoneNumberId is required." }, { status: 400 });
    }

    const account = await upsertConnectedWhatsAppAccount(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      ownerUserId: context.user.id,
      businessAccountId,
      phoneNumberId,
      displayPhoneNumber,
      verifiedName,
      webhookVerifyToken,
      accessTokenEncrypted,
      status: "active",
      metadata: {
        configuredFrom: "web_dashboard",
      },
    });

    return Response.json({
      provider: account.provider,
      connected: account.status === "active",
      phoneNumberId: account.phoneNumberId,
      displayPhoneNumber: account.displayPhoneNumber,
      verifiedName: account.verifiedName,
      status: account.status,
      lastSyncedAt: account.lastSyncedAt,
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}
