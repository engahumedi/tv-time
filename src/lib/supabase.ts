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

/** How long any single backend request may take before it is abandoned. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * fetch with a hard timeout. Without it, a backend that never answers (paused
 * project, DNS gone, flaky network) leaves auth calls pending forever — the
 * sign-in button sat on "Please wait…" and the app never got past its spinner.
 */
const fetchWithTimeout: typeof fetch = (input, init) => {
  // Older Safari lacks these helpers — fall back to the plain request there.
  if (typeof AbortSignal.timeout !== 'function') return fetch(input, init);
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let signal: AbortSignal = timeout;
  if (init?.signal) {
    if (typeof AbortSignal.any !== 'function') return fetch(input, init);
    signal = AbortSignal.any([init.signal, timeout]);
  }
  return fetch(input, { ...init, signal });
};

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(URL!, ANON!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'showtrack:auth',
      },
      global: { fetch: fetchWithTimeout },
    })
  : null;

/** Base URL of the Edge Function that proxies TMDB/OMDb (keys stay server-side). */
export function functionsBase(): string | null {
  if (!URL) return null;
  return `${URL.replace(/\/$/, '')}/functions/v1`;
}

export const supabaseAnonKey = ANON;
