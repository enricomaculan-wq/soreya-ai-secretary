import { markDailySummaryViewed } from "@soreya/database";

import { jsonError, readString } from "@/lib/server/daily-summary-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const body = (await request.json()) as Record<string, unknown>;
    const summaryId = readString(body.summaryId);

    if (!summaryId) {
      return Response.json({ error: "summaryId is required." }, { status: 400 });
    }

    const summary = await markDailySummaryViewed(
      context.supabase,
      context.userOrganization.organization.id,
      summaryId,
    );

    return Response.json({ summary });
  } catch (error) {
    return jsonError(error, 400);
  }
}
