import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { SOREYA_ACCESS_TOKEN_COOKIE, SOREYA_REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function POST(request: Request) {
  const rateLimit = await checkRateLimitAsync(request, { route: "/api/auth/session", limit: 30 });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  const body = (await request.json()) as {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };

  if (!body.accessToken) {
    return NextResponse.json({ error: "Missing access token." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(body.accessToken);

    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid Supabase session." }, { status: 401 });
    }

    const cookieStore = await cookies();
    const maxAge = body.expiresAt ? Math.max(60, body.expiresAt - Math.floor(Date.now() / 1000)) : 60 * 60;

    cookieStore.set(SOREYA_ACCESS_TOKEN_COOKIE, body.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge,
    });

    if (body.refreshToken) {
      cookieStore.set(SOREYA_REFRESH_TOKEN_COOKIE, body.refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to persist session." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SOREYA_ACCESS_TOKEN_COOKIE);
  cookieStore.delete(SOREYA_REFRESH_TOKEN_COOKIE);

  return NextResponse.json({ ok: true });
}
