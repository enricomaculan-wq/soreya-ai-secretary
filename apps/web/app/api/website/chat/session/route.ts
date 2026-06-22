import {
  createWebsiteChatSession,
  getOrganizationBySlug,
} from "@soreya/database";
import { isWebsiteChatIngestEnabled, parseWebsiteFormSettings } from "@soreya/shared";
import { z } from "zod";

import { generateWebsiteChatSessionToken } from "@/lib/server/website-chat-api";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import { createIntegrationServerSupabaseClient } from "@/lib/server/supabase";
import { readWebsiteFormToken, websiteChatCorsHeaders } from "@/lib/server/website-chat-public";

export const runtime = "nodejs";

const sessionSchema = z.object({
  organizationSlug: z.string().trim().min(2).max(64),
  visitorName: z.string().trim().max(120).optional().nullable(),
  visitorEmail: z.string().trim().email().max(240).optional().nullable().or(z.literal("")),
  pageUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
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
    const rateLimit = await checkRateLimitAsync(request, { route: "/api/website/chat/session" });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = sessionSchema.parse(await request.json());
    const supabase = createIntegrationServerSupabaseClient();
    const organization = await getOrganizationBySlug(supabase, body.organizationSlug);

    if (!organization) {
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

    const sessionToken = generateWebsiteChatSessionToken();
    const session = await createWebsiteChatSession(supabase, {
      organizationId: organization.id,
      sessionToken,
      visitorName: body.visitorName ?? null,
      visitorEmail: body.visitorEmail || null,
      pageUrl: body.pageUrl || null,
    });

    return Response.json(
      {
        ok: true,
        sessionToken: session.sessionToken,
        sessionId: session.id,
      },
      { headers: websiteChatCorsHeaders(origin) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Website chat session creation failed.";
    return Response.json({ ok: false, error: message }, { status: 400, headers: websiteChatCorsHeaders(origin) });
  }
}
