import { functionsBase, supabaseAnonKey } from './supabase';

const OMDB_KEY = import.meta.env.VITE_OMDB_API_KEY as string | undefined;
const PROXY = functionsBase();
const useProxy = Boolean(PROXY);
const hasDirectKey = Boolean(OMDB_KEY && OMDB_KEY.trim());

/** True when IMDb ratings can be fetched — via the proxy or a dev key. */
export const hasOmdbKey = hasDirectKey || useProxy;

export interface ImdbRating {
  rating: string; // e.g. "9.5"
  votes: string; // e.g. "2,145,003"
}

interface OmdbResponse {
  Response: 'True' | 'False';
  imdbRating?: string;
  imdbVotes?: string;
}

// In-memory cache so revisiting a show doesn't re-hit OMDb.
const cache = new Map<string, ImdbRating | null>();

/**
 * Look up a show's IMDb rating by its IMDb id (from TMDB external_ids).
 * Returns null when unavailable — the UI simply hides the badge.
 */
export async function getImdbRating(
  imdbId: string | undefined,
): Promise<ImdbRating | null> {
  if (!hasOmdbKey || !imdbId) return null;
  if (cache.has(imdbId)) return cache.get(imdbId)!;
  try {
    let url: string;
    const headers: Record<string, string> = {};
    if (useProxy) {
      url = `${PROXY}/api/omdb?i=${encodeURIComponent(imdbId)}`;
      if (supabaseAnonKey) {
        headers.apikey = supabaseAnonKey;
        headers.Authorization = `Bearer ${supabaseAnonKey}`;
      }
    } else {
      url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${encodeURIComponent(imdbId)}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as OmdbResponse;
    const rating =
      data.Response === 'True' && data.imdbRating && data.imdbRating !== 'N/A'
        ? { rating: data.imdbRating, votes: data.imdbVotes ?? '' }
        : null;
    cache.set(imdbId, rating);
    return rating;
  } catch {
    return null;
  }
}
