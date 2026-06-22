import { createIntegrationServerSupabaseClient } from "@/lib/server/supabase";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import { notifyWebsiteInboundMessage } from "@/lib/server/notifications";
import { ingestWebsiteFormSubmission } from "@/lib/server/website-form-ingest";
import { getOrganizationBySlug } from "@soreya/database";
import { parseWebsiteFormSettings } from "@soreya/shared";
import { z } from "zod";

export const runtime = "nodejs";

const websiteFormSchema = z.object({
  organizationSlug: z.string().trim().min(2).max(64),
  name: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().max(240).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().min(3).max(5000),
  service: z.string().trim().max(120).optional().nullable(),
  preferredDateTime: z.string().trim().max(240).optional().nullable(),
  pageUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  formName: z.string().trim().max(120).optional().nullable(),
  website: z.string().max(0).optional(),
});

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Soreya-Form-Token",
  };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  try {
    const rateLimit = await checkRateLimitAsync(request, { route: "/api/website/form" });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = websiteFormSchema.parse(await request.json());

    if (body.website) {
      return Response.json({ ok: false, error: "Spam detected." }, { status: 400, headers: corsHeaders(origin) });
    }

    const supabase = createIntegrationServerSupabaseClient();
    const organization = await getOrganizationBySlug(supabase, body.organizationSlug);

    if (!organization) {
      return Response.json({ ok: false, error: "Organization not found." }, { status: 404, headers: corsHeaders(origin) });
    }

    const websiteForm = parseWebsiteFormSettings(organization.settings);

    if (!websiteForm.enabled || !websiteForm.ingestToken) {
      return Response.json({ ok: false, error: "Website form ingest is disabled." }, { status: 403, headers: corsHeaders(origin) });
    }

    const providedToken = readFormToken(request);

    if (!providedToken || providedToken !== websiteForm.ingestToken) {
      return Response.json({ ok: false, error: "Invalid form token." }, { status: 401, headers: corsHeaders(origin) });
    }

    const result = await ingestWebsiteFormSubmission(supabase, {
      organizationId: organization.id,
      timezone: organization.default_timezone,
      name: body.name,
      email: body.email || null,
      phone: body.phone,
      message: body.message,
      service: body.service,
      preferredDateTime: body.preferredDateTime,
      pageUrl: body.pageUrl || null,
      formName: body.formName,
    });

    if (result.suggestedActions > 0) {
      notifyWebsiteInboundMessage(supabase, {
        organizationId: organization.id,
        channel: "form",
        messageSnippet: body.message,
      }).catch(() => undefined);
    }

    return Response.json(
      {
        ok: true,
        providerMessageId: result.providerMessageId,
        appointmentRequests: result.appointmentRequests,
        suggestedActions: result.suggestedActions,
      },
      { headers: corsHeaders(origin) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Website form ingest failed.";
    return Response.json({ ok: false, error: message }, { status: 400, headers: corsHeaders(origin) });
  }
}

function readFormToken(request: Request) {
  const headerToken = request.headers.get("x-soreya-form-token")?.trim();
  if (headerToken) {
    return headerToken;
  }

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice("bearer ".length).trim();
  }

  return null;
}
