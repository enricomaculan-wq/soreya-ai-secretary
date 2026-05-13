import { getExecutionRecords } from "@soreya/database";
import type { ExecutionStatus } from "@soreya/shared";

import { jsonError } from "@/lib/server/approvals-api";
import { getAuthenticatedServerContext } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const context = await getAuthenticatedServerContext();
    const url = new URL(request.url);
    const records = await getExecutionRecords(context.supabase, context.userOrganization.organization.id, {
      statuses: parseExecutionStatuses(url.searchParams.get("statuses")),
      suggestedActionId: url.searchParams.get("suggestedActionId") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 50),
    });

    return Response.json({ records });
  } catch (error) {
    return jsonError(error, 400);
  }
}

function parseExecutionStatuses(value: string | null): ExecutionStatus[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as ExecutionStatus[];
}
