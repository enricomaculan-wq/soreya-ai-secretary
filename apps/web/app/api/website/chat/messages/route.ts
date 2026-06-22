import {
  getWebsiteChatSessionByToken,
  listWebsiteChatMessages,
} from "@soreya/database";
import { isWebsiteChatIngestEnabled, parseWebsiteFormSettings } from "@soreya/shared";
import { z } from "zod";

import { readWebsiteFormToken, websiteChatCorsHeaders } from "@/lib/server/website-chat-public";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import { createIntegrationServerSupabaseClient } from "@/lib/server/supabase";

export const runtime = "nodejs";

const querySchema = z.object({
  sessionToken: z.string().trim().min(16).max(128),
  after: z.string().trim().optional().nullable(),
});

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: websiteChatCorsHeaders(origin),
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");

  try {
    const rateLimit = await checkRateLimitAsync(request, { route: "/api/website/chat/messages" });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const url = new URL(request.url);
    const query = querySchema.parse({
      sessionToken: url.searchParams.get("sessionToken"),
      after: url.searchParams.get("after"),
    });

    const supabase = createIntegrationServerSupabaseClient();
    const session = await getWebsiteChatSessionByToken(supabase, query.sessionToken);

    if (!session) {
      return Response.json({ ok: false, error: "Chat session not found." }, { status: 404, headers: websiteChatCorsHeaders(origin) });
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("settings")
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

    const messages = await listWebsiteChatMessages(supabase, session.id, {
      after: query.after || null,
    });

    return Response.json(
      {
        ok: true,
        messages: messages.map((message) => ({
          id: message.id,
          direction: message.direction,
          bodyText: message.bodyText,
          authorName: message.authorName,
          createdAt: message.createdAt,
        })),
      },
      { headers: websiteChatCorsHeaders(origin) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Website chat polling failed.";
    return Response.json({ ok: false, error: message }, { status: 400, headers: websiteChatCorsHeaders(origin) });
  }
}
