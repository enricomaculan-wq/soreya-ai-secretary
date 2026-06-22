import {
  createAuditLog,
  getNotificationPreferences,
  type SoreyaSupabaseClient,
} from "@soreya/database";

export async function buildPrivacyExport(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    userEmail: string | null;
    organizationName: string;
    membershipRole: string;
  },
) {
  const [preferences, auditLogs, suggestedActions, executionRecords] = await Promise.all([
    getNotificationPreferences(supabase, input.organizationId, input.userId).catch(() => null),
    supabase
      .from("audit_logs")
      .select("id, event_name, entity_table, entity_id, metadata, created_at")
      .eq("organization_id", input.organizationId)
      .eq("actor_user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("suggested_actions")
      .select("id, action_type, status, title, created_at, updated_at, approved_at")
      .eq("organization_id", input.organizationId)
      .eq("approved_by", input.userId)
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("execution_records")
      .select("id, execution_type, status, dry_run, provider, created_at, executed_at")
      .eq("organization_id", input.organizationId)
      .eq("executed_by", input.userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (auditLogs.error) {
    throw auditLogs.error;
  }

  if (suggestedActions.error) {
    throw suggestedActions.error;
  }

  if (executionRecords.error) {
    throw executionRecords.error;
  }

  return {
    exportedAt: new Date().toISOString(),
    scope: "organization_member",
    account: {
      userId: input.userId,
      email: input.userEmail,
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      role: input.membershipRole,
    },
    notificationPreferences: preferences,
    suggestedActions: suggestedActions.data ?? [],
    executionRecords: executionRecords.data ?? [],
    auditLogs: auditLogs.data ?? [],
    notes: [
      "This export contains organization-scoped operational metadata only.",
      "Full message bodies and provider tokens are excluded for safety.",
    ],
  };
}

export async function recordPrivacyDeletionRequest(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    reason?: string | null;
  },
) {
  await createAuditLog(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    eventName: "privacy_deletion_requested",
    entityTable: "users",
    entityId: input.userId,
    metadata: {
      reason: input.reason ?? null,
      status: "recorded",
    },
  });
}
