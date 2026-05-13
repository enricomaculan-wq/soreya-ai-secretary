import {
  createSoreyaSupabaseClientFromEnv,
  readSupabasePublicConfig,
  type SoreyaSupabaseClient,
} from "@soreya/database";

let browserClient: SoreyaSupabaseClient | null = null;

export function getSupabaseBrowserClient(): SoreyaSupabaseClient {
  if (!browserClient) {
    browserClient = createSoreyaSupabaseClientFromEnv({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  }

  return browserClient;
}

export function hasSupabaseBrowserConfig(): boolean {
  try {
    readSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
    return true;
  } catch {
    return false;
  }
}
