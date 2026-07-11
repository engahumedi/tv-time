import type {
  ParsedShowGroup,
  ParsedMovieGroup,
  WatchRecord,
  ImportSummary,
  Show,
  Movie,
  Episode,
} from '../types';
import {
  getAllEpisodes,
  findShowByName,
  getShowDetail,
  searchMovies,
  getMovieDetail,
} from './tmdb';
import { bestMatch, titleSimilarity, AUTO_MATCH_THRESHOLD } from './match';
import { searchShows } from './tmdb';
import {
  upsertShow,
  saveEpisodes,
  bulkImportWatches,
  bulkImportMovies,
  recomputeStatus,
} from './repo';
import { episodeId } from './ids';

/**
 * Attempt to auto-match every group to a show in the database (TMDB or demo).
 * Runs with limited concurrency and reports progress so the UI can animate.
 */
export async function autoMatchGroups(
  groups: ParsedShowGroup[],
  onProgress?: (done: number, total: number, current: ParsedShowGroup) => void,
): Promise<void> {
  let done = 0;
  const CONCURRENCY = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < groups.length) {
      const group = groups[cursor++];
      try {
        const candidates = await searchShows(group.seriesName);
        const { show, score } = bestMatch(group.seriesName, candidates);
        if (show && score >= AUTO_MATCH_THRESHOLD) {
          group.match = show;
          group.resolved = true;
        } else {
          // Keep the top suggestion visible but leave it unresolved.
          group.match = show ?? null;
          group.resolved = false;
        }
      } catch {
        group.match = null;
        group.resolved = false;
      }
      done++;
      onProgress?.(done, groups.length, group);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, groups.length) }, worker),
  );
}

/**
 * Commit resolved groups to the database: add each matched show, fetch its
 * episode list, then write the watch records (skipping duplicates).
 */
export async function commitImport(
  groups: ParsedShowGroup[],
  onProgress?: (done: number, total: number, show: Show) => void,
): Promise<ImportSummary> {
  const resolved = groups.filter((g) => g.resolved && g.match);
  const summary: ImportSummary = {
    showsMatched: 0,
    showsUnmatched: groups.length - resolved.length,
    episodesImported: 0,
    duplicatesSkipped: 0,
    totalMinutes: 0,
    moviesMatched: 0,
    moviesImported: 0,
  };

  let done = 0;
  // A few shows in flight at once — each does several TMDB calls, so this
  // cuts a large import's wait time without hammering the API.
  const CONCURRENCY = 3;
  let cursor = 0;

  async function worker() {
    while (cursor < resolved.length) {
      const group = resolved[cursor++];
      const show = group.match!;
      try {
        // Ensure we have the full show + episode list stored.
        const detail = show.numberOfEpisodes ? show : await getShowDetail(show.id);
        await upsertShow(detail);
        const episodes = await getAllEpisodes(show.id, detail.episodeRuntime);
        await saveEpisodes(episodes);

        const records = buildWatchRecords(group, episodes, detail.episodeRuntime);
        const { imported, duplicates, minutes } = await bulkImportWatches(records);
        await recomputeStatus(show.id);

        summary.showsMatched++;
        summary.episodesImported += imported;
        summary.duplicatesSkipped += duplicates;
        summary.totalMinutes += minutes;
      } catch {
        summary.showsUnmatched++;
      }
      done++;
      onProgress?.(done, resolved.length, show);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, resolved.length) }, worker),
  );

  return summary;
}

/**
 * Convert a matched group's parsed watches into concrete WatchRecords, using
 * the fetched episode list for accurate runtimes. Watches that reference an
 * episode we don't have metadata for still count, using the show's default
 * runtime, so the user's history is never silently dropped.
 */
function buildWatchRecords(
  group: ParsedShowGroup,
  episodes: Episode[],
  defaultRuntime: number,
): WatchRecord[] {
  const show = group.match!;
  const byKey = new Map(
    episodes.map((e) => [`${e.seasonNumber}:${e.episodeNumber}`, e]),
  );
  // Collapse re-watches: one record per episode, keeping the earliest date, but
  // remember how many times it was watched so re-watches carry over from TV Time.
  const byEpisode = new Map<string, WatchRecord>();
  const counts = new Map<string, number>();
  for (const w of group.watches) {
    if (w.episodeNumber === null) continue;
    const key = `${w.seasonNumber}:${w.episodeNumber}`;
    const ep = byKey.get(key);
    const id = episodeId(show.id, w.seasonNumber ?? 1, w.episodeNumber);
    const watchedAt = w.watchedAt ?? Date.now();
    counts.set(id, (counts.get(id) ?? 0) + 1);
    const record: WatchRecord = {
      episodeId: id,
      showId: show.id,
      seasonNumber: w.seasonNumber ?? 1,
      episodeNumber: w.episodeNumber,
      watchedAt,
      runtime: ep?.runtime ?? defaultRuntime,
      source: 'import',
    };
    const prev = byEpisode.get(id);
    if (!prev || record.watchedAt < prev.watchedAt) byEpisode.set(id, record);
  }
  return [...byEpisode.values()].map((r) => {
    const n = counts.get(r.episodeId) ?? 1;
    return n > 1 ? { ...r, plays: n } : r;
  });
}

// ---------------------------------------------------------------------------
// Movies
// ---------------------------------------------------------------------------

/** Best movie candidate for a title, by normalized-title similarity. */
function bestMovieMatch(
  target: string,
  candidates: Movie[],
): { movie: Movie | null; score: number } {
  let best: Movie | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = Math.max(
      titleSimilarity(target, c.title),
      c.originalTitle ? titleSimilarity(target, c.originalTitle) : 0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return { movie: best, score: bestScore };
}

/** Auto-match parsed movie groups to TMDB movies. */
export async function autoMatchMovies(
  groups: ParsedMovieGroup[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  let done = 0;
  const CONCURRENCY = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < groups.length) {
      const group = groups[cursor++];
      try {
        const candidates = await searchMovies(group.title);
        const { movie, score } = bestMovieMatch(group.title, candidates);
        if (movie && score >= AUTO_MATCH_THRESHOLD) {
          group.match = movie;
          group.resolved = true;
        } else {
          group.match = movie ?? null;
          group.resolved = false;
        }
      } catch {
        group.match = null;
        group.resolved = false;
      }
      done++;
      onProgress?.(done, groups.length);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, groups.length) }, worker),
  );
}

/**
 * Commit resolved movie groups: fetch runtime, then insert as watched movies.
 * Runs the runtime look-ups concurrently and reports progress, so importing
 * many movies stays fast and the UI can show it's still working.
 */
export async function commitMovies(
  groups: ParsedMovieGroup[],
  onProgress?: (done: number, total: number, movie: Movie) => void,
): Promise<{ matched: number; imported: number; minutes: number }> {
  const resolved = groups.filter((g) => g.resolved && g.match);
  const movies: Movie[] = new Array(resolved.length);
  let done = 0;
  const CONCURRENCY = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < resolved.length) {
      const i = cursor++;
      const group = resolved[i];
      const base = group.match!;
      let full = base;
      if (!full.runtime) {
        try {
          full = await getMovieDetail(base.id);
        } catch {
          /* keep the lightweight record */
        }
      }
      movies[i] = {
        ...full,
        watched: true,
        watchedAt: group.watchedAt ?? Date.now(),
        addedAt: Date.now(),
      };
      done++;
      onProgress?.(done, resolved.length, base);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, resolved.length) }, worker),
  );

  const { imported, minutes } = await bulkImportMovies(movies.filter(Boolean));
  return { matched: resolved.length, imported, minutes };
}

export { findShowByName };
