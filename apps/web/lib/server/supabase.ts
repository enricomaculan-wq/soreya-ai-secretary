import {
  createSoreyaSupabaseClientFromEnv,
  getUserOrganization,
  type SoreyaSupabaseClient,
  type UserOrganization,
} from "@soreya/database";
import type { User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

import { SOREYA_ACCESS_TOKEN_COOKIE, SOREYA_REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";

export { SOREYA_ACCESS_TOKEN_COOKIE, SOREYA_REFRESH_TOKEN_COOKIE };

export class ServerAuthError extends Error {
  constructor(
    message: string,
    public readonly status = 401,
  ) {
    super(message);
  }
}

export type AuthenticatedServerContext = {
  supabase: SoreyaSupabaseClient;
  user: User;
  userOrganization: UserOrganization;
  accessToken: string;
};

export function createServerSupabaseClient(accessToken?: string): SoreyaSupabaseClient {
  return createSoreyaSupabaseClientFromEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    },
  );
}

export function createServiceRoleServerSupabaseClient(): SoreyaSupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server integration routes.");
  }

  return createSoreyaSupabaseClientFromEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: serviceRoleKey,
    },
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

export function createIntegrationServerSupabaseClient(): SoreyaSupabaseClient {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return createServiceRoleServerSupabaseClient();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in production for integration routes.");
  }

  return createServerSupabaseClient();
}

async function resolveServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SOREYA_ACCESS_TOKEN_COOKIE)?.value;

  if (cookieToken) {
    return cookieToken;
  }

  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const bearerToken = authorization.slice("Bearer ".length).trim();
    return bearerToken || null;
  }

  return null;
}

export async function getAuthenticatedServerContext(): Promise<AuthenticatedServerContext> {
  const accessToken = await resolveServerAccessToken();

  if (!accessToken) {
    throw new ServerAuthError("Authentication required.");
  }

  const supabase = createServerSupabaseClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new ServerAuthError("Invalid or expired session.");
  }

  const userOrganization = await getUserOrganization(supabase, data.user.id);

  if (!userOrganization) {
    throw new ServerAuthError("Organization onboarding required.", 428);
  }

  return {
    supabase,
    user: data.user,
    userOrganization,
    accessToken,
  };
}
