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

/** Everything OMDb knows about a title's scores. */
export interface ExternalRatings {
  imdb: ImdbRating | null;
  /** Metacritic score out of 100. */
  metacritic: number | null;
}

interface OmdbResponse {
  Response: 'True' | 'False';
  imdbRating?: string;
  imdbVotes?: string;
  Metascore?: string;
}

// In-memory cache so revisiting a show doesn't re-hit OMDb.
const cache = new Map<string, ImdbRating | null>();
const fullCache = new Map<string, ExternalRatings | null>();

/** One OMDb lookup by IMDb id, via the proxy (or a dev key). */
async function fetchOmdb(imdbId: string): Promise<OmdbResponse | null> {
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
  return data.Response === 'True' ? data : null;
}

function toImdb(data: OmdbResponse): ImdbRating | null {
  return data.imdbRating && data.imdbRating !== 'N/A'
    ? { rating: data.imdbRating, votes: data.imdbVotes ?? '' }
    : null;
}

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
    const data = await fetchOmdb(imdbId);
    const rating = data ? toImdb(data) : null;
    cache.set(imdbId, rating);
    return rating;
  } catch {
    return null;
  }
}

/**
 * IMDb + Metacritic in one lookup — OMDb returns both in the same payload, so
 * this costs exactly the same as the IMDb-only call. Used by the detail pages;
 * poster grids read IMDb from our own dataset mirror instead.
 */
export async function getExternalRatings(
  imdbId: string | undefined,
): Promise<ExternalRatings | null> {
  if (!hasOmdbKey || !imdbId) return null;
  if (fullCache.has(imdbId)) return fullCache.get(imdbId)!;
  try {
    const data = await fetchOmdb(imdbId);
    if (!data) {
      fullCache.set(imdbId, null);
      return null;
    }
    const meta = data.Metascore && data.Metascore !== 'N/A' ? Number(data.Metascore) : null;
    const value: ExternalRatings = {
      imdb: toImdb(data),
      metacritic: Number.isFinite(meta as number) ? (meta as number) : null,
    };
    // Also warm the IMDb-only cache — same payload, no reason to refetch.
    cache.set(imdbId, value.imdb);
    fullCache.set(imdbId, value);
    return value;
  } catch {
    return null;
  }
}
