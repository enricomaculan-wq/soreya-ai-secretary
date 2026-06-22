import type { Session } from "@supabase/supabase-js";

export async function syncSupabaseSessionToServer(session: Session | null): Promise<void> {
  if (!session) {
    const response = await fetch("/api/auth/session", { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Unable to clear server session.");
    }
    return;
  }

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Unable to persist server session (${response.status}).`);
  }
}

export function redirectAfterAuth(path: string) {
  window.location.assign(path);
}
