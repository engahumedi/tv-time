import { db } from './db';
import { episodeId } from './ids';
import {
  cloudUpsertShow,
  cloudDeleteShow,
  cloudUpsertWatches,
  cloudDeleteWatch,
  cloudUpsertList,
  cloudDeleteList,
  cloudUpsertMovie,
  cloudDeleteMovie,
} from './cloud';
import type {
  Show,
  Episode,
  WatchRecord,
  ShowStatus,
  ShowList,
  Movie,
} from '../types';

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
  const merged: Show = {
    ...show,
    status: existing?.status ?? show.status,
    addedAt: existing?.addedAt ?? show.addedAt,
  };
  await db.shows.put(merged);
  void cloudUpsertShow(merged);
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

export async function getWatch(id: string): Promise<WatchRecord | undefined> {
  return db.watches.get(id);
}

/**
 * Set the user's 1–5 star rating for an episode. Rating implies watched, so
 * this also creates the watch record (preserving any existing watched date).
 */
export async function rateEpisode(
  ep: Episode,
  rating: number,
  defaultRuntime = 30,
): Promise<void> {
  const existing = await db.watches.get(ep.id);
  const record: WatchRecord = {
    episodeId: ep.id,
    showId: ep.showId,
    seasonNumber: ep.seasonNumber,
    episodeNumber: ep.episodeNumber,
    watchedAt: existing?.watchedAt ?? Date.now(),
    runtime: existing?.runtime ?? ep.runtime ?? defaultRuntime,
    rating: rating || undefined,
    source: existing?.source ?? 'manual',
  };
  await db.watches.put(record);
  void cloudUpsertWatches([record]);
  await recomputeStatus(ep.showId);
}

/** Set the user's 1–10 rating for a whole show. */
export async function rateShow(showId: number, rating: number): Promise<void> {
  await db.shows.update(showId, { userRating: rating || undefined });
  const show = await db.shows.get(showId);
  if (show) void cloudUpsertShow(show);
}

/** Toggle a show's favourite flag. */
export async function toggleFavorite(showId: number): Promise<void> {
  const show = await db.shows.get(showId);
  if (!show) return;
  const favorite = !show.favorite;
  await db.shows.update(showId, { favorite: favorite || undefined });
  void cloudUpsertShow({ ...show, favorite: favorite || undefined });
}

/** Replace the tags on a show. */
export async function setTags(showId: number, tags: string[]): Promise<void> {
  const clean = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  await db.shows.update(showId, { tags: clean.length ? clean : undefined });
  const show = await db.shows.get(showId);
  if (show) void cloudUpsertShow(show);
}

/** Save a personal note for an episode (implies the episode is tracked). */
export async function setEpisodeNote(
  ep: Episode,
  note: string,
  defaultRuntime = 30,
): Promise<void> {
  const existing = await db.watches.get(ep.id);
  const record: WatchRecord = {
    episodeId: ep.id,
    showId: ep.showId,
    seasonNumber: ep.seasonNumber,
    episodeNumber: ep.episodeNumber,
    watchedAt: existing?.watchedAt ?? Date.now(),
    runtime: existing?.runtime ?? ep.runtime ?? defaultRuntime,
    rating: existing?.rating,
    note: note.trim() || undefined,
    source: existing?.source ?? 'manual',
  };
  await db.watches.put(record);
  void cloudUpsertWatches([record]);
}

// ---- custom lists ----

export async function createList(
  name: string,
  kind: 'show' | 'movie' = 'show',
): Promise<ShowList> {
  const list: ShowList = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `list_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: name.trim() || 'List',
    showIds: [],
    createdAt: Date.now(),
    kind,
  };
  await db.lists.put(list);
  void cloudUpsertList(list);
  return list;
}

export async function renameList(id: string, name: string): Promise<void> {
  await db.lists.update(id, { name: name.trim() || 'List' });
  const l = await db.lists.get(id);
  if (l) void cloudUpsertList(l);
}

export async function deleteList(id: string): Promise<void> {
  await db.lists.delete(id);
  void cloudDeleteList(id);
}

/** Add/remove a show from a list. */
export async function toggleShowInList(
  id: string,
  showId: number,
): Promise<void> {
  const l = await db.lists.get(id);
  if (!l) return;
  const has = l.showIds.includes(showId);
  l.showIds = has
    ? l.showIds.filter((x) => x !== showId)
    : [...l.showIds, showId];
  await db.lists.put(l);
  void cloudUpsertList(l);
}

/** Add several items to a list at once (no-op for ids already present). */
export async function addItemsToList(
  id: string,
  itemIds: number[],
): Promise<void> {
  const l = await db.lists.get(id);
  if (!l) return;
  const set = new Set(l.showIds);
  for (const itemId of itemIds) set.add(itemId);
  l.showIds = [...set];
  await db.lists.put(l);
  void cloudUpsertList(l);
}

/** Mark a single episode watched. Idempotent — same episode never duplicates. */
export async function markWatched(
  ep: Episode,
  watchedAt = Date.now(),
  source: WatchRecord['source'] = 'manual',
  defaultRuntime = 30,
): Promise<void> {
  const existing = await db.watches.get(ep.id);
  const record: WatchRecord = {
    episodeId: ep.id,
    showId: ep.showId,
    seasonNumber: ep.seasonNumber,
    episodeNumber: ep.episodeNumber,
    watchedAt,
    runtime: ep.runtime ?? defaultRuntime,
    rating: existing?.rating,
    note: existing?.note,
    source,
    plays: existing?.plays,
  };
  await db.watches.put(record);
  void cloudUpsertWatches([record]);
  await recomputeStatus(ep.showId);
}

/**
 * Log another watch of an episode (a re-watch). First watch marks it; each
 * subsequent call bumps the play count and refreshes the watched date.
 */
export async function rewatchEpisode(
  ep: Episode,
  defaultRuntime = 30,
): Promise<void> {
  const existing = await db.watches.get(ep.id);
  const record: WatchRecord = {
    episodeId: ep.id,
    showId: ep.showId,
    seasonNumber: ep.seasonNumber,
    episodeNumber: ep.episodeNumber,
    watchedAt: Date.now(),
    runtime: ep.runtime ?? defaultRuntime,
    rating: existing?.rating,
    note: existing?.note,
    source: 'manual',
    plays: (existing?.plays ?? 1) + 1,
  };
  await db.watches.put(record);
  void cloudUpsertWatches([record]);
  await recomputeStatus(ep.showId);
}

/** Remove one re-watch (never below 1 — use unmarkWatched to fully un-watch). */
export async function removeRewatch(id: string, showId: number): Promise<void> {
  const existing = await db.watches.get(id);
  if (!existing) return;
  const plays = Math.max(1, (existing.plays ?? 1) - 1);
  const record: WatchRecord = { ...existing, plays: plays > 1 ? plays : undefined };
  await db.watches.put(record);
  void cloudUpsertWatches([record]);
  await recomputeStatus(showId);
}

/** Log another watch of every already-watched episode of a show. */
export async function rewatchShow(showId: number): Promise<void> {
  const watched = await db.watches.where('showId').equals(showId).toArray();
  if (watched.length === 0) return;
  const now = Date.now();
  const records = watched.map((w) => ({
    ...w,
    watchedAt: now,
    plays: (w.plays ?? 1) + 1,
  }));
  await db.watches.bulkPut(records);
  void cloudUpsertWatches(records);
  await recomputeStatus(showId);
}

export async function unmarkWatched(id: string, showId: number): Promise<void> {
  await db.watches.delete(id);
  void cloudDeleteWatch(id);
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
  void cloudUpsertWatches(records);
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
  void cloudUpsertWatches(records);
  await recomputeStatus(showId);
}

export async function setStatus(
  showId: number,
  status: ShowStatus,
): Promise<void> {
  await db.shows.update(showId, { status });
  const show = await db.shows.get(showId);
  if (show) void cloudUpsertShow(show);
}

export async function removeShow(showId: number): Promise<void> {
  await db.transaction('rw', db.shows, db.episodes, db.watches, async () => {
    await db.shows.delete(showId);
    await db.episodes.where('showId').equals(showId).delete();
    await db.watches.where('showId').equals(showId).delete();
  });
  void cloudDeleteShow(showId);
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
  if (status !== show.status) {
    await db.shows.update(showId, { status });
    void cloudUpsertShow({ ...show, status });
  }
}

function hasAired(airDate: string | null): boolean {
  if (!airDate) return false;
  const d = new Date(airDate).getTime();
  return !Number.isNaN(d) && d <= Date.now();
}

/**
 * Bulk-insert watches during import. New episodes are inserted; episodes that
 * already exist are not overwritten, except that a higher re-watch count from
 * the file is backfilled onto them — so re-importing a TV Time export adds
 * re-watches to an already-imported library without disturbing the user's
 * first-watch date, rating or note.
 */
export async function bulkImportWatches(
  records: WatchRecord[],
): Promise<{ imported: number; duplicates: number; minutes: number }> {
  if (!records.length) return { imported: 0, duplicates: 0, minutes: 0 };
  // Collapse duplicates in the file: earliest watchedAt, highest play count.
  const deduped = new Map<string, WatchRecord>();
  for (const r of records) {
    const prev = deduped.get(r.episodeId);
    if (!prev) {
      deduped.set(r.episodeId, r);
    } else {
      const base = r.watchedAt < prev.watchedAt ? r : prev;
      const plays = Math.max(prev.plays ?? 1, r.plays ?? 1);
      deduped.set(r.episodeId, { ...base, plays: plays > 1 ? plays : undefined });
    }
  }
  const ids = [...deduped.keys()];
  const existingById = new Map(
    ((await db.watches.bulkGet(ids)).filter(Boolean) as WatchRecord[]).map((r) => [
      r.episodeId,
      r,
    ]),
  );
  const toInsert: WatchRecord[] = [];
  const toUpdate: WatchRecord[] = [];
  for (const r of deduped.values()) {
    const cur = existingById.get(r.episodeId);
    if (!cur) {
      toInsert.push(r);
    } else if ((r.plays ?? 1) > (cur.plays ?? 1)) {
      toUpdate.push({ ...cur, plays: r.plays });
    }
  }
  const duplicates = records.length - toInsert.length;
  const minutes = toInsert.reduce((a, r) => a + r.runtime, 0);
  const writes = [...toInsert, ...toUpdate];
  if (writes.length) {
    await db.watches.bulkPut(writes);
    void cloudUpsertWatches(writes);
  }
  return { imported: toInsert.length, duplicates, minutes };
}

export { episodeId };

// ---- movies (tracked separately from TV shows) ----

/** Add a movie to the library (or update its metadata). Preserves watched state. */
export async function addMovie(movie: Movie): Promise<void> {
  const existing = await db.movies.get(movie.id);
  const merged: Movie = {
    ...movie,
    watched: existing?.watched ?? movie.watched,
    watchedAt: existing?.watchedAt ?? movie.watchedAt,
    favorite: existing?.favorite ?? movie.favorite,
    userRating: existing?.userRating ?? movie.userRating,
    addedAt: existing?.addedAt ?? movie.addedAt,
  };
  await db.movies.put(merged);
  void cloudUpsertMovie(merged);
}

/** Mark a movie watched / unwatched (adds it to the library if needed). */
export async function setMovieWatched(
  movie: Movie,
  watched: boolean,
): Promise<void> {
  const existing = await db.movies.get(movie.id);
  const base = existing ?? movie;
  const next: Movie = {
    ...base,
    watched,
    // Watching a movie clears it from the "want to watch" queue.
    watchlist: watched ? undefined : base.watchlist,
    watchedAt: watched ? base.watchedAt ?? Date.now() : undefined,
  };
  await db.movies.put(next);
  void cloudUpsertMovie(next);
}

/**
 * Add / remove a movie from the "want to watch" list (adds it to the library
 * if needed). Watched movies can't sit on the watchlist.
 */
export async function setMovieWatchlist(
  movie: Movie,
  watchlist: boolean,
): Promise<void> {
  const existing = await db.movies.get(movie.id);
  const base = existing ?? movie;
  const next: Movie = {
    ...base,
    watchlist: watchlist || undefined,
    watched: watchlist ? false : base.watched,
    watchedAt: watchlist ? undefined : base.watchedAt,
  };
  await db.movies.put(next);
  void cloudUpsertMovie(next);
}

export async function toggleMovieFavorite(id: number): Promise<void> {
  const m = await db.movies.get(id);
  if (!m) return;
  const next: Movie = { ...m, favorite: !m.favorite || undefined };
  await db.movies.put(next);
  void cloudUpsertMovie(next);
}

export async function rateMovie(id: number, rating: number): Promise<void> {
  const m = await db.movies.get(id);
  if (!m) return;
  const next: Movie = { ...m, userRating: rating || undefined };
  await db.movies.put(next);
  void cloudUpsertMovie(next);
}

export async function removeMovie(id: number): Promise<void> {
  await db.movies.delete(id);
  void cloudDeleteMovie(id);
}

/** Bulk-insert imported movies, skipping ones already in the library. */
export async function bulkImportMovies(
  movies: Movie[],
): Promise<{ imported: number; duplicates: number; minutes: number }> {
  if (!movies.length) return { imported: 0, duplicates: 0, minutes: 0 };
  const deduped = new Map<number, Movie>();
  for (const m of movies) deduped.set(m.id, m);
  const ids = [...deduped.keys()];
  const existing = new Set(
    (await db.movies.bulkGet(ids)).filter(Boolean).map((m) => m!.id),
  );
  const toInsert = [...deduped.values()].filter((m) => !existing.has(m.id));
  const duplicates = movies.length - toInsert.length;
  const minutes = toInsert.reduce((a, m) => a + (m.runtime || 0), 0);
  if (toInsert.length) {
    await db.movies.bulkPut(toInsert);
    for (const m of toInsert) void cloudUpsertMovie(m);
  }
  return { imported: toInsert.length, duplicates, minutes };
}

/** Wipe everything — used by the "reset data" action. */
export async function clearAll(): Promise<void> {
  await db.transaction(
    'rw',
    db.shows,
    db.episodes,
    db.watches,
    db.movies,
    async () => {
      await db.shows.clear();
      await db.episodes.clear();
      await db.watches.clear();
      await db.movies.clear();
    },
  );
}
