import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client, created only when the project is configured via env vars.
 * When these are absent the app runs exactly as before — local-only, no auth —
 * so the site never breaks if the backend isn't set up yet.
 *
 * The anon key is safe to expose in the browser: it only grants what the
 * Row Level Security policies allow (each user sees only their own rows).
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabase = Boolean(URL && ANON);

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(URL!, ANON!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'showtrack:auth',
      },
    })
  : null;

/** Base URL of the Edge Function that proxies TMDB/OMDb (keys stay server-side). */
export function functionsBase(): string | null {
  if (!URL) return null;
  return `${URL.replace(/\/$/, '')}/functions/v1`;
}

export const supabaseAnonKey = ANON;
