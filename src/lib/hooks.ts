import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Show, Episode, WatchRecord, ShowList, Movie } from '../types';

export function useLists(): ShowList[] | undefined {
  return useLiveQuery(() => db.lists.orderBy('createdAt').toArray());
}

/** Every movie in the library, newest first. */
export function useMovies(): Movie[] | undefined {
  return useLiveQuery(() => db.movies.orderBy('addedAt').reverse().toArray());
}

/** The movie record for a single id (or null), reactive. */
export function useMovie(id: number): Movie | null | undefined {
  return useLiveQuery(async () => (await db.movies.get(id)) ?? null, [id]);
}

export interface WatchListItem {
  show: Show;
  episode: Episode;
  /** Unwatched aired episodes remaining after this one. */
  remaining: number;
  /** Epoch ms of the most recent watch for this show (0 if never). */
  lastWatchedAt: number;
  /** The next episode is the start of a season/series. */
  isPremiere: boolean;
}

/**
 * The "watch next" list: for every followed show with an unwatched aired
 * episode, the next episode to watch, how many remain, and when it was last
 * watched (so the UI can surface "haven't watched for a while").
 */
export function useWatchList(): WatchListItem[] | undefined {
  return useLiveQuery(async () => {
    const shows = await db.shows.toArray();
    const now = Date.now();
    const items: WatchListItem[] = [];
    for (const show of shows) {
      const eps = (await db.episodes.where('showId').equals(show.id).toArray()).sort(
        (a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
      );
      const watchedIds = new Set(
        (await db.watches.where('showId').equals(show.id).primaryKeys()) as string[],
      );
      const watches = await db.watches.where('showId').equals(show.id).toArray();
      const airedUnwatched = eps.filter((e) => {
        if (watchedIds.has(e.id)) return false;
        if (!e.airDate) return false;
        const t = new Date(e.airDate).getTime();
        return !Number.isNaN(t) && t <= now;
      });
      if (airedUnwatched.length === 0) continue;
      const episode = airedUnwatched[0];
      const lastWatchedAt = watches.reduce((m, w) => Math.max(m, w.watchedAt), 0);
      items.push({
        show,
        episode,
        remaining: airedUnwatched.length - 1,
        lastWatchedAt,
        isPremiere: episode.episodeNumber === 1,
      });
    }
    return items;
  });
}

export interface CalendarItem {
  show: Show;
  episode: Episode;
  ts: number;
}

/**
 * Episodes from followed shows around now: everything from ~2 weeks ago
 * forward, so the calendar shows both recently-aired and upcoming episodes.
 */
export function useCalendar(): CalendarItem[] | undefined {
  return useLiveQuery(async () => {
    const shows = await db.shows.toArray();
    const showById = new Map(shows.map((s) => [s.id, s]));
    const since = Date.now() - 14 * 864e5;
    const items: CalendarItem[] = [];
    for (const show of shows) {
      const eps = await db.episodes.where('showId').equals(show.id).toArray();
      for (const e of eps) {
        if (!e.airDate) continue;
        const ts = new Date(e.airDate).getTime();
        if (Number.isNaN(ts) || ts < since) continue;
        items.push({ show: showById.get(show.id)!, episode: e, ts });
      }
    }
    return items.sort((a, b) => a.ts - b.ts).slice(0, 100);
  });
}

/** The user's followed shows, newest first. Reactively updates on any change. */
export function useLibrary(): Show[] | undefined {
  return useLiveQuery(() =>
    db.shows.orderBy('addedAt').reverse().toArray(),
  );
}

export function useShow(id: number): Show | undefined {
  return useLiveQuery(() => db.shows.get(id), [id]);
}

export function useEpisodes(showId: number): Episode[] | undefined {
  return useLiveQuery(
    () =>
      db.episodes
        .where('showId')
        .equals(showId)
        .sortBy('episodeNumber'),
    [showId],
  );
}

export function useWatchedIds(showId: number): Set<string> | undefined {
  const watches = useLiveQuery(
    () => db.watches.where('showId').equals(showId).primaryKeys(),
    [showId],
  );
  return watches ? new Set(watches as string[]) : undefined;
}

export function useAllWatches(): WatchRecord[] | undefined {
  return useLiveQuery(() => db.watches.toArray());
}

/** The watch record (watched date + rating) for a single episode, or null. */
export function useWatch(episodeId: string | null): WatchRecord | null | undefined {
  return useLiveQuery(
    async () => (episodeId ? ((await db.watches.get(episodeId)) ?? null) : null),
    [episodeId],
  );
}

export function useIsInLibrary(id: number): boolean {
  const show = useLiveQuery(() => db.shows.get(id), [id]);
  return Boolean(show);
}

/**
 * The "To Watch" feed: for every followed show, the next unwatched *aired*
 * episode, sorted by air date (oldest first, so you clear your backlog).
 */
export interface ToWatchItem {
  show: Show;
  episode: Episode;
}

export function useToWatch(): ToWatchItem[] | undefined {
  return useLiveQuery(async () => {
    const shows = await db.shows.toArray();
    const items: ToWatchItem[] = [];
    const now = Date.now();
    for (const show of shows) {
      const episodes = await db.episodes
        .where('showId')
        .equals(show.id)
        .toArray();
      episodes.sort(
        (a, b) =>
          a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
      );
      const watchedIds = new Set(
        (await db.watches
          .where('showId')
          .equals(show.id)
          .primaryKeys()) as string[],
      );
      const next = episodes.find((e) => {
        if (watchedIds.has(e.id)) return false;
        if (!e.airDate) return false;
        const aired = new Date(e.airDate).getTime();
        return !Number.isNaN(aired) && aired <= now;
      });
      if (next) items.push({ show, episode: next });
    }
    items.sort(
      (a, b) =>
        new Date(a.episode.airDate ?? 0).getTime() -
        new Date(b.episode.airDate ?? 0).getTime(),
    );
    return items;
  });
}
