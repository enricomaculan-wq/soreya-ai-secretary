import {
  createSoreyaSupabaseClientFromEnv,
  getUserOrganization,
  type SoreyaSupabaseClient,
  type UserOrganization,
} from "@soreya/database";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const SOREYA_ACCESS_TOKEN_COOKIE = "soreya-sb-access-token";
export const SOREYA_REFRESH_TOKEN_COOKIE = "soreya-sb-refresh-token";

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
  return createSoreyaSupabaseClientFromEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
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

export async function getAuthenticatedServerContext(): Promise<AuthenticatedServerContext> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(SOREYA_ACCESS_TOKEN_COOKIE)?.value;

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
