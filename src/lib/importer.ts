import type {
  ParsedShowGroup,
  WatchRecord,
  ImportSummary,
  Show,
  Episode,
} from '../types';
import { getAllEpisodes, findShowByName, getShowDetail } from './tmdb';
import { bestMatch, AUTO_MATCH_THRESHOLD } from './match';
import { searchShows } from './tmdb';
import { upsertShow, saveEpisodes, bulkImportWatches, recomputeStatus } from './repo';
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
  };

  let done = 0;
  for (const group of resolved) {
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
  // Collapse re-watches: one record per episode, keeping the earliest date.
  const byEpisode = new Map<string, WatchRecord>();
  for (const w of group.watches) {
    if (w.episodeNumber === null) continue;
    const key = `${w.seasonNumber}:${w.episodeNumber}`;
    const ep = byKey.get(key);
    const id = episodeId(show.id, w.seasonNumber ?? 1, w.episodeNumber);
    const watchedAt = w.watchedAt ?? Date.now();
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
  return [...byEpisode.values()];
}

export { findShowByName };
