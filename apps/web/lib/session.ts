import type { Session } from "@supabase/supabase-js";

export async function syncSupabaseSessionToServer(session: Session | null): Promise<void> {
  if (!session) {
    await fetch("/api/auth/session", { method: "DELETE" });
    return;
  }

  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    }),
  });
}
