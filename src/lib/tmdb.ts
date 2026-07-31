import type { Show, Episode, Movie } from '../types';
import { episodeId } from './ids';
import { demoShows, demoEpisodes, searchDemoShows } from './demoData';
import { functionsBase, supabaseAnonKey } from './supabase';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

const PROXY = functionsBase();
const useProxy = Boolean(PROXY);
const hasDirectKey = Boolean(API_KEY && API_KEY.trim());

/** True when real TMDB data is available — via the secure proxy or a dev key. */
export const hasTmdbKey = hasDirectKey || useProxy;

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
  // Prefer the secure proxy (keeps the API key server-side); fall back to a
  // direct call when only a dev key is configured (local development).
  let url: URL;
  const headers: Record<string, string> = {};
  if (useProxy) {
    url = new URL(`${PROXY}/api/tmdb${path}`);
    if (supabaseAnonKey) {
      headers.apikey = supabaseAnonKey;
      headers.Authorization = `Bearer ${supabaseAnonKey}`;
    }
  } else {
    url = new URL(`${BASE}${path}`);
    url.searchParams.set('api_key', API_KEY!);
  }
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers });
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

/** Fetch a list of shows from any TMDB list endpoint, via the proxy. */
async function fetchShowList(
  path: string,
  params: Record<string, string> = {},
): Promise<Show[]> {
  if (!hasTmdbKey) return [];
  const [genres, data] = await Promise.all([
    loadGenres(),
    tmdb<{ results: TmdbSearchResult[] }>(path, {
      language: tmdbLang(),
      ...params,
    }),
  ]);
  return data.results
    .filter((r) => r.poster_path)
    .map((r) => searchResultToShow(r, genres));
}

export const getTrending = (page = 1): Promise<Show[]> =>
  fetchShowList('/trending/tv/week', { page: String(page) });
export const getTopRated = (page = 1): Promise<Show[]> =>
  fetchShowList('/tv/top_rated', { 'vote_count.gte': '300', page: String(page) });
export const discoverByGenre = (genreId: number): Promise<Show[]> =>
  fetchShowList('/discover/tv', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    'vote_count.gte': '100',
  });
export const getRecommendations = (showId: number): Promise<Show[]> =>
  showId < 0 ? Promise.resolve([]) : fetchShowList(`/tv/${showId}/recommendations`);

/** Filters for the Discover "Filters" tab (shared shape for shows + movies). */
export interface DiscoverFilters {
  genreId?: number | null;
  /** Four-digit year as a string, or '' for any. */
  year?: string;
  /** Minimum community rating 0–9, or 0 for any. */
  minRating?: number;
  /** 'popularity.desc' | 'vote_average.desc' | 'date.desc' */
  sort?: string;
  /** TMDB result page (used to randomise the Surprise picker). */
  page?: number;
}

function buildDiscoverParams(
  f: DiscoverFilters,
  dateSort: string,
  yearKey: string,
): Record<string, string> {
  const sort = f.sort === 'date.desc' ? dateSort : f.sort || 'popularity.desc';
  // Rating sorts need a vote floor or a single 10/10 obscurity wins.
  const params: Record<string, string> = {
    sort_by: sort,
    'vote_count.gte': f.sort === 'vote_average.desc' ? '200' : '50',
  };
  if (f.genreId) params.with_genres = String(f.genreId);
  if (f.year) params[yearKey] = f.year;
  if (f.minRating) params['vote_average.gte'] = String(f.minRating);
  if (f.page) params.page = String(f.page);
  return params;
}

export const discoverShows = (f: DiscoverFilters): Promise<Show[]> =>
  fetchShowList('/discover/tv', buildDiscoverParams(f, 'first_air_date.desc', 'first_air_date_year'));

/** The TMDB TV genre list, as {id, name}. */
export async function getGenreList(): Promise<{ id: number; name: string }[]> {
  const map = await loadGenres();
  return Object.entries(map).map(([id, name]) => ({ id: Number(id), name }));
}

export interface Person {
  id: number;
  name: string;
  profilePath: string | null;
  knownFor?: string;
}

export async function searchPeople(query: string): Promise<Person[]> {
  if (!hasTmdbKey || !query.trim()) return [];
  const data = await tmdb<{
    results: {
      id: number;
      name: string;
      profile_path: string | null;
      known_for_department: string;
    }[];
  }>('/search/person', { query, language: tmdbLang() });
  return data.results.map((p) => ({
    id: p.id,
    name: p.name,
    profilePath: p.profile_path,
    knownFor: p.known_for_department,
  }));
}

export async function getPersonCredits(
  id: number,
): Promise<{ person: Person; shows: Show[] }> {
  const genres = await loadGenres();
  const data = await tmdb<{
    id: number;
    name: string;
    profile_path: string | null;
    tv_credits: { cast: TmdbSearchResult[] };
  }>(`/person/${id}`, {
    append_to_response: 'tv_credits',
    language: tmdbLang(),
  });
  const seen = new Set<number>();
  const shows = (data.tv_credits?.cast ?? [])
    .filter((r) => r.poster_path && !seen.has(r.id) && seen.add(r.id))
    .map((r) => searchResultToShow(r, genres))
    .sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));
  return {
    person: { id: data.id, name: data.name, profilePath: data.profile_path },
    shows,
  };
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

/** Trailer (YouTube key) and top cast for a show. */
export async function getShowExtras(
  showId: number,
): Promise<{ trailerKey: string | null; cast: CastMember[] }> {
  if (!hasTmdbKey || showId < 0) return { trailerKey: null, cast: [] };
  const data = await tmdb<{
    videos: { results: { key: string; site: string; type: string; official: boolean }[] };
    credits: { cast: { id: number; name: string; character: string; profile_path: string | null }[] };
  }>(`/tv/${showId}`, { append_to_response: 'videos,credits', language: 'en-US' });
  const vids = data.videos?.results ?? [];
  const trailer =
    vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
    vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    vids.find((v) => v.site === 'YouTube');
  const cast = (data.credits?.cast ?? []).slice(0, 12).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profilePath: c.profile_path,
  }));
  return { trailerKey: trailer?.key ?? null, cast };
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

/**
 * Just the IMDb id for a TMDB title. List endpoints don't return one, so
 * poster cards need this before they can look up an IMDb/RT score. Responses
 * are cached by the edge proxy, and callers cache the resulting rating.
 */
export async function getImdbIdFor(
  kind: 'tv' | 'movie',
  id: number,
): Promise<string | null> {
  if (!hasTmdbKey || id < 0) return null;
  try {
    if (kind === 'movie') {
      const d = await tmdb<{ imdb_id: string | null }>(`/movie/${id}`, {
        language: tmdbLang(),
      });
      return d.imdb_id || null;
    }
    const d = await tmdb<{ imdb_id: string | null }>(`/tv/${id}/external_ids`, {});
    return d.imdb_id || null;
  } catch {
    return null;
  }
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

// ---------------------------------------------------------------------------
// Movies
// ---------------------------------------------------------------------------

let movieGenreMap: Record<number, string> | null = null;
async function loadMovieGenres(): Promise<Record<number, string>> {
  if (movieGenreMap) return movieGenreMap;
  try {
    const data = await tmdb<{ genres: { id: number; name: string }[] }>(
      '/genre/movie/list',
      { language: tmdbLang() },
    );
    movieGenreMap = Object.fromEntries(data.genres.map((g) => [g.id, g.name]));
  } catch {
    movieGenreMap = {};
  }
  return movieGenreMap;
}

interface TmdbMovieResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
}

function movieResultToMovie(
  r: TmdbMovieResult,
  genres: Record<number, string>,
): Movie {
  return {
    id: r.id,
    title: r.title,
    originalTitle: r.original_title,
    overview: r.overview,
    posterPath: r.poster_path,
    backdropPath: r.backdrop_path,
    releaseDate: r.release_date || null,
    genres: (r.genre_ids || []).map((id) => genres[id]).filter(Boolean),
    runtime: 0,
    voteAverage: r.vote_average || undefined,
    watched: false,
    addedAt: Date.now(),
  };
}

/** Search movies by title. Returns [] in demo mode (no movie demo data). */
export async function searchMovies(query: string): Promise<Movie[]> {
  if (!hasTmdbKey || !query.trim()) return [];
  const [genres, data] = await Promise.all([
    loadMovieGenres(),
    tmdb<{ results: TmdbMovieResult[] }>('/search/movie', {
      query,
      include_adult: 'false',
      language: tmdbLang(),
    }),
  ]);
  return data.results.map((r) => movieResultToMovie(r, genres));
}

async function fetchMovieList(
  path: string,
  params: Record<string, string> = {},
): Promise<Movie[]> {
  if (!hasTmdbKey) return [];
  const [genres, data] = await Promise.all([
    loadMovieGenres(),
    tmdb<{ results: TmdbMovieResult[] }>(path, { language: tmdbLang(), ...params }),
  ]);
  return data.results
    .filter((r) => r.poster_path)
    .map((r) => movieResultToMovie(r, genres));
}

export const getTrendingMovies = (page = 1): Promise<Movie[]> =>
  fetchMovieList('/trending/movie/week', { page: String(page) });
export const getTopRatedMovies = (page = 1): Promise<Movie[]> =>
  fetchMovieList('/movie/top_rated', { 'vote_count.gte': '500', page: String(page) });
export const getMovieRecommendations = (movieId: number): Promise<Movie[]> =>
  movieId < 0 ? Promise.resolve([]) : fetchMovieList(`/movie/${movieId}/recommendations`);

/** The TMDB movie genre list, as {id, name}. */
export async function getMovieGenreList(): Promise<{ id: number; name: string }[]> {
  const map = await loadMovieGenres();
  return Object.entries(map).map(([id, name]) => ({ id: Number(id), name }));
}

export const discoverMovies = (f: DiscoverFilters): Promise<Movie[]> =>
  fetchMovieList('/discover/movie', buildDiscoverParams(f, 'primary_release_date.desc', 'primary_release_year'));

interface TmdbMovieDetail extends TmdbMovieResult {
  genres: { id: number; name: string }[];
  runtime: number | null;
  imdb_id: string | null;
}

/** Full movie detail — used when adding, to capture runtime and IMDb id. */
export async function getMovieDetail(id: number): Promise<Movie> {
  const d = await tmdb<TmdbMovieDetail>(`/movie/${id}`, { language: tmdbLang() });
  return {
    id: d.id,
    title: d.title,
    originalTitle: d.original_title,
    overview: d.overview,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path,
    releaseDate: d.release_date || null,
    genres: (d.genres || []).map((g) => g.name),
    runtime: d.runtime ?? 0,
    voteAverage: d.vote_average || undefined,
    imdbId: d.imdb_id ?? undefined,
    watched: false,
    addedAt: Date.now(),
  };
}

export interface WatchProvider {
  id: number;
  name: string;
  logo: string | null;
}

interface ProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}
interface ProvidersResponse {
  results: Record<string, { link?: string; flatrate?: ProviderEntry[]; free?: ProviderEntry[]; ads?: ProviderEntry[] }>;
}

/** Preferred provider region for the current UI language. */
function providerRegion(): string {
  try {
    return localStorage.getItem('showtrack:lang') === 'ar' ? 'SA' : 'US';
  } catch {
    return 'US';
  }
}

/**
 * "Where to watch" — streaming (flatrate/free/ads) providers for a title in the
 * user's region, falling back to US then any available country. Returns a link
 * to the TMDB watch page too (deep links need JustWatch attribution).
 */
export async function getWatchProviders(
  kind: 'tv' | 'movie',
  id: number,
): Promise<{ link: string | null; providers: WatchProvider[] }> {
  if (!hasTmdbKey) return { link: null, providers: [] };
  let data: ProvidersResponse;
  try {
    data = await tmdb<ProvidersResponse>(`/${kind}/${id}/watch/providers`);
  } catch {
    return { link: null, providers: [] };
  }
  const results = data.results || {};
  const region = providerRegion();
  const entry = results[region] || results.US || results[Object.keys(results)[0]] || {};
  const seen = new Set<number>();
  const providers: WatchProvider[] = [];
  for (const p of [...(entry.flatrate ?? []), ...(entry.free ?? []), ...(entry.ads ?? [])]) {
    if (seen.has(p.provider_id)) continue;
    seen.add(p.provider_id);
    providers.push({ id: p.provider_id, name: p.provider_name, logo: p.logo_path });
  }
  return { link: entry.link ?? null, providers };
}
