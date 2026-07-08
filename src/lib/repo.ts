import { db } from './db';
import { episodeId } from './ids';
import type { Show, Episode, WatchRecord, ShowStatus } from '../types';

/**
 * Repository layer — the single place that mutates the database. Keeping all
 * writes here means status recomputation and dedupe logic live in one spot.
 */

export async function getShow(id: number): Promise<Show | undefined> {
  return db.shows.get(id);
}

export async function getAllShows(): Promise<Show[]> {
  return db.shows.toArray();
}

export async function upsertShow(show: Show): Promise<void> {
  const existing = await db.shows.get(show.id);
  // Preserve user-controlled fields when re-adding a show.
  await db.shows.put({
    ...show,
    status: existing?.status ?? show.status,
    addedAt: existing?.addedAt ?? show.addedAt,
  });
}

export async function saveEpisodes(episodes: Episode[]): Promise<void> {
  if (episodes.length) await db.episodes.bulkPut(episodes);
}

export async function getEpisodesForShow(showId: number): Promise<Episode[]> {
  const list = await db.episodes.where('showId').equals(showId).toArray();
  return list.sort(
    (a, b) =>
      a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
  );
}

export async function getWatchesForShow(showId: number): Promise<WatchRecord[]> {
  return db.watches.where('showId').equals(showId).toArray();
}

export async function getAllWatches(): Promise<WatchRecord[]> {
  return db.watches.toArray();
}

export async function isWatched(id: string): Promise<boolean> {
  return (await db.watches.get(id)) !== undefined;
}

/** Mark a single episode watched. Idempotent — same episode never duplicates. */
export async function markWatched(
  ep: Episode,
  watchedAt = Date.now(),
  source: WatchRecord['source'] = 'manual',
  defaultRuntime = 30,
): Promise<void> {
  const record: WatchRecord = {
    episodeId: ep.id,
    showId: ep.showId,
    seasonNumber: ep.seasonNumber,
    episodeNumber: ep.episodeNumber,
    watchedAt,
    runtime: ep.runtime ?? defaultRuntime,
    source,
  };
  await db.watches.put(record);
  await recomputeStatus(ep.showId);
}

export async function unmarkWatched(id: string, showId: number): Promise<void> {
  await db.watches.delete(id);
  await recomputeStatus(showId);
}

/** Mark every episode of a season watched at once. */
export async function markSeasonWatched(
  showId: number,
  seasonNumber: number,
  defaultRuntime = 30,
): Promise<void> {
  const episodes = (await getEpisodesForShow(showId)).filter(
    (e) => e.seasonNumber === seasonNumber,
  );
  const now = Date.now();
  const records: WatchRecord[] = episodes.map((ep) => ({
    episodeId: ep.id,
    showId,
    seasonNumber: ep.seasonNumber,
    episodeNumber: ep.episodeNumber,
    watchedAt: now,
    runtime: ep.runtime ?? defaultRuntime,
    source: 'manual',
  }));
  if (records.length) await db.watches.bulkPut(records);
  await recomputeStatus(showId);
}

/** Mark the entire show watched at once. */
export async function markShowWatched(
  showId: number,
  defaultRuntime = 30,
): Promise<void> {
  const episodes = await getEpisodesForShow(showId);
  const now = Date.now();
  const records: WatchRecord[] = episodes.map((ep) => ({
    episodeId: ep.id,
    showId,
    seasonNumber: ep.seasonNumber,
    episodeNumber: ep.episodeNumber,
    watchedAt: now,
    runtime: ep.runtime ?? defaultRuntime,
    source: 'manual',
  }));
  if (records.length) await db.watches.bulkPut(records);
  await recomputeStatus(showId);
}

export async function setStatus(
  showId: number,
  status: ShowStatus,
): Promise<void> {
  await db.shows.update(showId, { status });
}

export async function removeShow(showId: number): Promise<void> {
  await db.transaction('rw', db.shows, db.episodes, db.watches, async () => {
    await db.shows.delete(showId);
    await db.episodes.where('showId').equals(showId).delete();
    await db.watches.where('showId').equals(showId).delete();
  });
}

/**
 * Derive a show's status from how many of its episodes have been watched.
 * Only ever *upgrades* an explicit "stopped" if the user later completes it.
 */
export async function recomputeStatus(showId: number): Promise<void> {
  const show = await db.shows.get(showId);
  if (!show) return;
  const episodes = await getEpisodesForShow(showId);
  const airedEpisodes = episodes.filter((e) => hasAired(e.airDate));
  const watchedCount = await db.watches.where('showId').equals(showId).count();

  let status: ShowStatus;
  if (watchedCount === 0) {
    status = show.status === 'stopped' ? 'stopped' : 'not_started';
  } else if (episodes.length > 0 && watchedCount >= episodes.length) {
    status = 'finished';
  } else if (
    airedEpisodes.length > 0 &&
    watchedCount >= airedEpisodes.length
  ) {
    status = 'up_to_date';
  } else {
    status = show.status === 'stopped' ? 'stopped' : 'watching';
  }
  await db.shows.update(showId, { status });
}

function hasAired(airDate: string | null): boolean {
  if (!airDate) return false;
  const d = new Date(airDate).getTime();
  return !Number.isNaN(d) && d <= Date.now();
}

/** Bulk-insert watches during import, skipping ones that already exist. */
export async function bulkImportWatches(
  records: WatchRecord[],
): Promise<{ imported: number; duplicates: number; minutes: number }> {
  if (!records.length) return { imported: 0, duplicates: 0, minutes: 0 };
  // Keep the earliest watchedAt when the same episode appears twice in a file.
  const deduped = new Map<string, WatchRecord>();
  for (const r of records) {
    const prev = deduped.get(r.episodeId);
    if (!prev || r.watchedAt < prev.watchedAt) deduped.set(r.episodeId, r);
  }
  const ids = [...deduped.keys()];
  const existing = new Set(
    (await db.watches.bulkGet(ids)).filter(Boolean).map((r) => r!.episodeId),
  );
  const toInsert = [...deduped.values()].filter(
    (r) => !existing.has(r.episodeId),
  );
  const duplicates = records.length - toInsert.length;
  const minutes = toInsert.reduce((a, r) => a + r.runtime, 0);
  if (toInsert.length) await db.watches.bulkPut(toInsert);
  return { imported: toInsert.length, duplicates, minutes };
}

export { episodeId };

/** Wipe everything — used by the "reset data" action. */
export async function clearAll(): Promise<void> {
  await db.transaction('rw', db.shows, db.episodes, db.watches, async () => {
    await db.shows.clear();
    await db.episodes.clear();
    await db.watches.clear();
  });
}
