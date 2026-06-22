import {
  getWebsiteChatSessionByToken,
} from "@soreya/database";
import { isWebsiteChatIngestEnabled, parseWebsiteFormSettings } from "@soreya/shared";
import { z } from "zod";

import { ingestWebsiteChatMessage } from "@/lib/server/website-chat-ingest";
import { notifyWebsiteInboundMessage } from "@/lib/server/notifications";
import { readWebsiteFormToken, websiteChatCorsHeaders } from "@/lib/server/website-chat-public";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import { createIntegrationServerSupabaseClient } from "@/lib/server/supabase";

export const runtime = "nodejs";

const messageSchema = z.object({
  sessionToken: z.string().trim().min(16).max(128),
  message: z.string().trim().min(1).max(5000),
  name: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().max(240).optional().nullable().or(z.literal("")),
  pageUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  website: z.string().max(0).optional(),
});

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: websiteChatCorsHeaders(origin),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  try {
    const rateLimit = await checkRateLimitAsync(request, { route: "/api/website/chat/message" });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = messageSchema.parse(await request.json());

    if (body.website) {
      return Response.json({ ok: false, error: "Spam detected." }, { status: 400, headers: websiteChatCorsHeaders(origin) });
    }

    const supabase = createIntegrationServerSupabaseClient();
    const session = await getWebsiteChatSessionByToken(supabase, body.sessionToken);

    if (!session || session.status !== "open") {
      return Response.json({ ok: false, error: "Chat session not found." }, { status: 404, headers: websiteChatCorsHeaders(origin) });
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", session.organizationId)
      .single();

    if (organizationError || !organization) {
      return Response.json({ ok: false, error: "Organization not found." }, { status: 404, headers: websiteChatCorsHeaders(origin) });
    }

    if (!isWebsiteChatIngestEnabled(organization.settings)) {
      return Response.json({ ok: false, error: "Website chat ingest is disabled." }, { status: 403, headers: websiteChatCorsHeaders(origin) });
    }

    const formSettings = parseWebsiteFormSettings(organization.settings);
    const providedToken = readWebsiteFormToken(request);

    if (!providedToken || providedToken !== formSettings.ingestToken) {
      return Response.json({ ok: false, error: "Invalid form token." }, { status: 401, headers: websiteChatCorsHeaders(origin) });
    }

    const result = await ingestWebsiteChatMessage(supabase, {
      organizationId: session.organizationId,
      timezone: organization.default_timezone,
      sessionId: session.id,
      name: body.name ?? session.visitorName,
      email: body.email || session.visitorEmail,
      message: body.message,
      pageUrl: body.pageUrl || session.pageUrl,
    });

    if (result.suggestedActions > 0) {
      notifyWebsiteInboundMessage(supabase, {
        organizationId: session.organizationId,
        channel: "chat",
        messageSnippet: body.message,
      }).catch(() => undefined);
    }

    return Response.json(
      {
        ok: true,
        messageId: result.chatMessage.id,
        providerMessageId: result.providerMessageId,
        appointmentRequests: result.appointmentRequests,
        suggestedActions: result.suggestedActions,
      },
      { headers: websiteChatCorsHeaders(origin) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Website chat message ingest failed.";
    return Response.json({ ok: false, error: message }, { status: 400, headers: websiteChatCorsHeaders(origin) });
  }
}
