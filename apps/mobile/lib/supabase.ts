import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createSoreyaSupabaseClientFromEnv,
  readSupabasePublicConfig,
  type SoreyaSupabaseClient,
} from '@soreya/database';

let mobileClient: SoreyaSupabaseClient | null = null;

export function getSupabaseMobileClient(): SoreyaSupabaseClient {
  if (!mobileClient) {
    mobileClient = createSoreyaSupabaseClientFromEnv({
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    }, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: AsyncStorage,
      },
    });
  }

  return mobileClient;
}

export function hasSupabaseMobileConfig(): boolean {
  try {
    readSupabasePublicConfig({
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    });
    return true;
  } catch {
    return false;
  }
}
