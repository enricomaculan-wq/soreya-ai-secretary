import {
  getWebsiteChatSessionById,
  insertWebsiteChatMessage,
} from "@soreya/database";
import { z } from "zod";

import { jsonError } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

const replySchema = z.object({
  sessionId: z.string().uuid(),
  bodyText: z.string().trim().min(1).max(5000),
  authorName: z.string().trim().max(120).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const organizationId = context.userOrganization.organization.id;
    const body = replySchema.parse(await request.json());
    const session = await getWebsiteChatSessionById(context.supabase, organizationId, body.sessionId);

    if (!session) {
      return Response.json({ ok: false, error: "Chat session not found." }, { status: 404 });
    }

    if (session.status !== "open") {
      return Response.json({ ok: false, error: "Chat session is closed." }, { status: 400 });
    }

    const message = await insertWebsiteChatMessage(context.supabase, {
      organizationId,
      sessionId: session.id,
      direction: "outgoing",
      bodyText: body.bodyText,
      authorName: body.authorName?.trim() || context.userOrganization.organization.name,
    });

    return Response.json({
      ok: true,
      message: {
        id: message.id,
        direction: message.direction,
        bodyText: message.bodyText,
        authorName: message.authorName,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
