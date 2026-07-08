import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Show, Episode, WatchRecord } from '../types';

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
