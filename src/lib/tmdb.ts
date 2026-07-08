import type { Show, Episode } from '../types';
import { episodeId } from './ids';
import { demoShows, demoEpisodes, searchDemoShows } from './demoData';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

export const hasTmdbKey = Boolean(API_KEY && API_KEY.trim());

/** Current UI language mapped to a TMDB language tag (Arabic titles/overviews). */
function tmdbLang(): string {
  try {
    return localStorage.getItem('showtrack:lang') === 'ar' ? 'ar-SA' : 'en-US';
  } catch {
    return 'en-US';
  }
}

/** Build a full image URL from a TMDB path. Returns null when no path. */
export function img(
  path: string | null | undefined,
  size: 'w200' | 'w342' | 'w500' | 'w780' | 'original' = 'w342',
): string | null {
  if (!path) return null;
  return `${IMG}/${size}${path}`;
}

// A tiny in-memory genre cache so we can turn genre ids into names.
let genreMap: Record<number, string> | null = null;

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', API_KEY!);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function loadGenres(): Promise<Record<number, string>> {
  if (genreMap) return genreMap;
  try {
    const data = await tmdb<{ genres: { id: number; name: string }[] }>(
      '/genre/tv/list',
    );
    genreMap = Object.fromEntries(data.genres.map((g) => [g.id, g.name]));
  } catch {
    genreMap = {};
  }
  return genreMap;
}

interface TmdbSearchResult {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genre_ids: number[];
  vote_average: number;
}

/** Search shows by name. Falls back to the demo library with no key. */
export async function searchShows(query: string): Promise<Show[]> {
  if (!hasTmdbKey) return searchDemoShows(query);
  if (!query.trim()) return [];
  const [genres, data] = await Promise.all([
    loadGenres(),
    tmdb<{ results: TmdbSearchResult[] }>('/search/tv', {
      query,
      include_adult: 'false',
      language: tmdbLang(),
    }),
  ]);
  return data.results.map((r) => searchResultToShow(r, genres));
}

function searchResultToShow(
  r: TmdbSearchResult,
  genres: Record<number, string>,
): Show {
  return {
    id: r.id,
    name: r.name,
    originalName: r.original_name,
    overview: r.overview,
    posterPath: r.poster_path,
    backdropPath: r.backdrop_path,
    firstAirDate: r.first_air_date || null,
    genres: (r.genre_ids || []).map((id) => genres[id]).filter(Boolean),
    episodeRuntime: 30,
    voteAverage: r.vote_average || undefined,
    status: 'not_started',
    addedAt: Date.now(),
  };
}

interface TmdbShowDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genres: { id: number; name: string }[];
  number_of_episodes: number;
  number_of_seasons: number;
  episode_run_time: number[];
  vote_average: number;
  seasons: { season_number: number; episode_count: number }[];
  external_ids?: { imdb_id: string | null };
}

interface TmdbSeasonDetail {
  season_number: number;
  episodes: {
    id: number;
    name: string;
    overview: string;
    season_number: number;
    episode_number: number;
    air_date: string | null;
    runtime: number | null;
    still_path: string | null;
  }[];
}

/** Full show detail (used when adding a show to the library). */
export async function getShowDetail(id: number): Promise<Show> {
  if (!hasTmdbKey || id < 0) {
    const s = demoShows().find((d) => d.id === id);
    if (!s) throw new Error('Show not found in demo library');
    return s;
  }
  const d = await tmdb<TmdbShowDetail>(`/tv/${id}`, {
    language: tmdbLang(),
    append_to_response: 'external_ids',
  });
  return {
    id: d.id,
    name: d.name,
    originalName: d.original_name,
    overview: d.overview,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path,
    firstAirDate: d.first_air_date || null,
    genres: d.genres.map((g) => g.name),
    numberOfEpisodes: d.number_of_episodes,
    numberOfSeasons: d.number_of_seasons,
    episodeRuntime: d.episode_run_time?.[0] ?? 30,
    voteAverage: d.vote_average || undefined,
    imdbId: d.external_ids?.imdb_id ?? undefined,
    status: 'not_started',
    addedAt: Date.now(),
  };
}

/** Fetch every episode for a show, across all seasons. */
export async function getAllEpisodes(
  id: number,
  fallbackRuntime = 30,
): Promise<Episode[]> {
  if (!hasTmdbKey || id < 0) return demoEpisodes(id);
  const detail = await tmdb<TmdbShowDetail>(`/tv/${id}`, { language: tmdbLang() });
  const realSeasons = detail.seasons
    .map((s) => s.season_number)
    .filter((n) => n >= 1); // skip "Specials" (season 0)
  const runtime = detail.episode_run_time?.[0] ?? fallbackRuntime;
  const all: Episode[] = [];
  // Fetch seasons in small batches to be gentle on the API.
  for (let i = 0; i < realSeasons.length; i += 4) {
    const batch = realSeasons.slice(i, i + 4);
    const results = await Promise.all(
      batch.map((sn) =>
        tmdb<TmdbSeasonDetail>(`/tv/${id}/season/${sn}`, {
          language: tmdbLang(),
        }).catch(() => null),
      ),
    );
    for (const season of results) {
      if (!season) continue;
      for (const e of season.episodes) {
        all.push({
          id: episodeId(id, e.season_number, e.episode_number),
          showId: id,
          seasonNumber: e.season_number,
          episodeNumber: e.episode_number,
          name: e.name || `Episode ${e.episode_number}`,
          overview: e.overview,
          airDate: e.air_date || null,
          runtime: e.runtime ?? runtime,
          stillPath: e.still_path,
        });
      }
    }
  }
  return all;
}

/**
 * Find the single best show match for a name (used by the importer). Returns
 * null if nothing plausible is found so the caller can offer manual matching.
 */
export async function findShowByName(name: string): Promise<Show | null> {
  const results = await searchShows(name);
  return results[0] ?? null;
}
