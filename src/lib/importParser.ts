import Papa from 'papaparse';
import JSZip from 'jszip';
import type {
  ParsedWatch,
  ParsedShowGroup,
  ParsedMovie,
  ParsedMovieGroup,
} from '../types';

/**
 * Parses TV Time data exports. TV Time has shipped several export layouts over
 * the years (older "seen_episode" CSVs, newer "tracking-prod-records" files,
 * and localized column names). Rather than assume one shape, we detect the
 * relevant columns from the header row by matching against known aliases.
 */

// Column aliases seen across TV Time export versions (all lowercased).
const COLUMN_ALIASES = {
  seriesName: [
    'series_name',
    'show_name',
    'seriesname',
    'series',
    'show',
    'tv_show',
    'tv_show_name',
    'series_title',
    'title',
  ],
  seriesId: [
    'series_id',
    'show_id',
    'tvdb_id',
    'thetvdb_id',
    'tmdb_id',
    'themoviedb_id',
    'seriesid',
    'entity_id',
  ],
  season: [
    'season_number',
    'episode_season_number',
    'season',
    'season_no',
    'seasonnumber',
    's',
  ],
  episode: [
    'episode_number',
    'episode',
    'episode_no',
    'episodenumber',
    'number',
    'e',
  ],
  episodeName: ['episode_name', 'episodename', 'episode_title', 'name'],
  watchedAt: [
    'watched_at',
    'created_at',
    'updated_at',
    'watched_date',
    'date_watched',
    'timestamp',
    'seen_at',
    'first_watched',
    'watch_date',
  ],
  // Some newer exports encode everything in one "episode label" like
  // "S01E04" alongside the series name.
  episodeLabel: ['episode_label', 'label', 'code'],
  // An explicit watch/re-watch count, when the export stores one row per
  // episode with a tally instead of one row per watch.
  plays: [
    'plays',
    'play_count',
    'watch_count',
    'watched_count',
    'watches_count',
    'number_of_watches',
    'number_of_plays',
    'times_watched',
    'rewatch_count',
    'rewatches',
    'view_count',
  ],
} as const;

type Field = keyof typeof COLUMN_ALIASES;

/**
 * TV Time appends the same `series_name / movie_name / season / episode` columns
 * to many non-watch files (ratings, emotions, comments, character votes,
 * "where to watch", recommendations). Those reference a show/movie but are NOT
 * watch history, so we skip them by filename to avoid importing things the user
 * never watched.
 */
const NON_WATCH_FILE = /vote|rating|emotion|comment|where-to-watch|recommend/i;

/** Map real headers to our logical fields. Returns null if this file has no watch data. */
function detectColumns(headers: string[]): Partial<Record<Field, string>> | null {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const map: Partial<Record<Field, string>> = {};
  for (const field of Object.keys(COLUMN_ALIASES) as Field[]) {
    for (const alias of COLUMN_ALIASES[field]) {
      const idx = lower.indexOf(alias);
      if (idx !== -1) {
        map[field] = headers[idx];
        break;
      }
    }
  }
  // A file is "watch data" only if it can tell us a series and an episode.
  const hasSeries = map.seriesName || map.seriesId;
  const hasEpisode = map.episode || map.episodeLabel;
  if (!hasSeries || !hasEpisode) return null;
  return map;
}

function parseInt2(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

/** Parse "S01E04" / "1x04" style labels into season & episode. */
function parseLabel(label: string): { season: number | null; episode: number | null } {
  const m1 = label.match(/s(\d+)\s*e(\d+)/i);
  if (m1) return { season: parseInt(m1[1], 10), episode: parseInt(m1[2], 10) };
  const m2 = label.match(/(\d+)\s*x\s*(\d+)/i);
  if (m2) return { season: parseInt(m2[1], 10), episode: parseInt(m2[2], 10) };
  return { season: null, episode: null };
}

function parseDate(v: unknown): number | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // Handle unix seconds/millis stored as bare numbers.
  if (/^\d{10}$/.test(s)) return parseInt(s, 10) * 1000;
  if (/^\d{13}$/.test(s)) return parseInt(s, 10);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

/** Parse a single CSV file's text into watch rows. */
export function parseCsv(text: string, sourceFile: string): ParsedWatch[] {
  if (NON_WATCH_FILE.test(sourceFile)) return [];
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields ?? [];
  const cols = detectColumns(headers);
  if (!cols) return [];

  const rows: ParsedWatch[] = [];
  for (const row of result.data) {
    let season = cols.season ? parseInt2(row[cols.season]) : null;
    let episode = cols.episode ? parseInt2(row[cols.episode]) : null;

    if ((season === null || episode === null) && cols.episodeLabel) {
      const parsed = parseLabel(row[cols.episodeLabel] ?? '');
      season = season ?? parsed.season;
      episode = episode ?? parsed.episode;
    }
    // Skip rows with no episode info at all.
    if (episode === null) continue;

    const seriesName = cols.seriesName ? (row[cols.seriesName] ?? '').trim() : '';
    const seriesExternalId = cols.seriesId
      ? (row[cols.seriesId] ?? '').trim() || undefined
      : undefined;
    // A row with neither a name nor an id can't be matched later — skip it.
    if (!seriesName && !seriesExternalId) continue;

    const plays = cols.plays ? parseInt2(row[cols.plays]) : null;
    rows.push({
      seriesName: seriesName || `Series ${seriesExternalId}`,
      seriesExternalId,
      seasonNumber: season ?? 1,
      episodeNumber: episode,
      episodeName: cols.episodeName ? row[cols.episodeName]?.trim() : undefined,
      watchedAt: cols.watchedAt ? parseDate(row[cols.watchedAt]) : null,
      plays: plays && plays > 1 ? plays : null,
      sourceFile,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Movies — TV Time's real export puts movies alongside episodes in the tracking
// files (e.g. `tracking-prod-records.csv`): a `movie_name` column is populated
// for movie rows, while `series_name` / `episode_number` are populated for
// episode rows. We therefore detect a movie-title column and emit a movie for
// every row where it is filled — this coexists with the episode parser, which
// only emits rows that have an episode number.
// ---------------------------------------------------------------------------

const MOVIE_TITLE_ALIASES = [
  'movie_name',
  'movie_title',
  'film_name',
  'film_title',
];
// Movie-specific id columns only (not tmdb_id/imdb_id — in a mixed tracking
// file those refer to the episode/series, not the movie).
const MOVIE_ID_ALIASES = ['movie_id', 'film_id'];
const GENERIC_TITLE_ALIASES = ['title', 'name'];

interface MovieCols {
  title: string;
  id?: string;
  watchedAt?: string;
}

/**
 * Detect the movie-title column. Keys on a dedicated `movie_name`-style column,
 * or — only when the filename clearly mentions "movie"/"film" — a generic title
 * column. Returns null for files with no movie signal (so series/watchlist
 * files are never misread as movies).
 */
function detectMovieColumns(headers: string[], filename: string): MovieCols | null {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const find = (aliases: readonly string[]): string | undefined => {
    for (const a of aliases) {
      const idx = lower.indexOf(a);
      if (idx !== -1) return headers[idx];
    }
    return undefined;
  };

  const movieTitle = find(MOVIE_TITLE_ALIASES);
  const filenameHint = /movie|film/i.test(filename);
  // Prefer a dedicated movie column; only fall back to a generic title column
  // when the filename itself signals movies.
  const title = movieTitle ?? (filenameHint ? find(GENERIC_TITLE_ALIASES) : undefined);
  if (!title) return null;

  return {
    title,
    id: find(MOVIE_ID_ALIASES),
    watchedAt: find(COLUMN_ALIASES.watchedAt),
  };
}

/** Parse a CSV's text into movie rows (returns [] when it isn't a movie file). */
export function parseMoviesCsv(text: string, sourceFile: string): ParsedMovie[] {
  if (NON_WATCH_FILE.test(sourceFile)) return [];
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields ?? [];
  const cols = detectMovieColumns(headers, sourceFile);
  if (!cols) return [];

  const rows: ParsedMovie[] = [];
  for (const row of result.data) {
    const title = cols.title ? (row[cols.title] ?? '').trim() : '';
    const externalId = cols.id ? (row[cols.id] ?? '').trim() || undefined : undefined;
    if (!title && !externalId) continue;
    rows.push({
      title: title || `Movie ${externalId}`,
      externalId,
      watchedAt: cols.watchedAt ? parseDate(row[cols.watchedAt]) : null,
      sourceFile,
    });
  }
  return rows;
}

export interface ParseResult {
  watches: ParsedWatch[];
  /** Movies parsed from the export. */
  movies: ParsedMovie[];
  /** Files we opened but found no recognizable watch data in. */
  ignoredFiles: string[];
  /** Files that contained watch data. */
  dataFiles: string[];
}

/** Read one uploaded File (either a .zip or a single .csv) into watch rows. */
export async function parseUpload(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.zip')) return parseZip(file);
  if (name.endsWith('.csv')) {
    const text = await file.text();
    // A single file can hold both episode rows and movie rows, so run both.
    const watches = parseCsv(text, file.name);
    const movies = parseMoviesCsv(text, file.name);
    return watches.length || movies.length
      ? { watches, movies, ignoredFiles: [], dataFiles: [file.name] }
      : { watches: [], movies: [], ignoredFiles: [file.name], dataFiles: [] };
  }
  return { watches: [], movies: [], ignoredFiles: [file.name], dataFiles: [] };
}

async function parseZip(file: File): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(file);
  const watches: ParsedWatch[] = [];
  const movies: ParsedMovie[] = [];
  const ignoredFiles: string[] = [];
  const dataFiles: string[] = [];
  const csvEntries = Object.values(zip.files).filter(
    (f) => !f.dir && f.name.toLowerCase().endsWith('.csv'),
  );
  for (const entry of csvEntries) {
    const text = await entry.async('string');
    const short = entry.name.split('/').pop() || entry.name;
    // A single file can hold both episode rows and movie rows, so run both.
    const rows = parseCsv(text, short);
    const movieRows = parseMoviesCsv(text, short);
    if (rows.length || movieRows.length) {
      watches.push(...rows);
      movies.push(...movieRows);
      dataFiles.push(short);
    } else {
      ignoredFiles.push(short);
    }
  }
  return { watches, movies, ignoredFiles, dataFiles };
}

/** Merge results from several uploaded files. */
export function mergeResults(results: ParseResult[]): ParseResult {
  return {
    watches: results.flatMap((r) => r.watches),
    movies: results.flatMap((r) => r.movies),
    ignoredFiles: [...new Set(results.flatMap((r) => r.ignoredFiles))],
    dataFiles: [...new Set(results.flatMap((r) => r.dataFiles))],
  };
}

/** De-duplicate parsed movies (by id or normalized title), keeping earliest date. */
export function groupMovies(movies: ParsedMovie[]): ParsedMovieGroup[] {
  const groups = new Map<string, ParsedMovieGroup>();
  for (const m of movies) {
    const key = m.externalId ? `id:${m.externalId}` : `name:${m.title.toLowerCase()}`;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        title: m.title,
        externalId: m.externalId,
        watchedAt: m.watchedAt,
        resolved: false,
      });
    } else if (m.watchedAt && (!g.watchedAt || m.watchedAt < g.watchedAt)) {
      g.watchedAt = m.watchedAt;
    }
  }
  return [...groups.values()];
}

/** Group flat watch rows by series so the UI can preview & match per show. */
export function groupBySeries(watches: ParsedWatch[]): ParsedShowGroup[] {
  const groups = new Map<string, ParsedShowGroup>();
  for (const w of watches) {
    // Prefer grouping by external id when present, else by normalized name.
    const key = w.seriesExternalId
      ? `id:${w.seriesExternalId}`
      : `name:${w.seriesName.toLowerCase()}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        seriesName: w.seriesName,
        seriesExternalId: w.seriesExternalId,
        episodeCount: 0,
        watches: [],
        resolved: false,
      };
      groups.set(key, g);
    }
    g.watches.push(w);
  }
  for (const g of groups.values()) {
    // episodeCount = distinct episodes (a re-watch shouldn't inflate it).
    const distinct = new Set(
      g.watches.map((w) => `${w.seasonNumber}:${w.episodeNumber}`),
    );
    g.episodeCount = distinct.size;
  }
  return [...groups.values()].sort((a, b) => b.episodeCount - a.episodeCount);
}
