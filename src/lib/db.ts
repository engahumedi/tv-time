import Dexie, { type Table } from 'dexie';
import type { Show, Episode, WatchRecord, ShowList, Movie } from '../types';

/**
 * Local-first storage. Everything the user tracks lives in IndexedDB, so the
 * app works offline and no account/backend is required. The TV Time import can
 * write tens of thousands of rows here comfortably.
 */
export class ShowTrackDB extends Dexie {
  shows!: Table<Show, number>;
  episodes!: Table<Episode, string>;
  watches!: Table<WatchRecord, string>;
  lists!: Table<ShowList, string>;
  movies!: Table<Movie, number>;

  constructor() {
    super('showtrack');
    this.version(1).stores({
      // Indexes chosen for the queries the app actually runs.
      shows: 'id, name, status, addedAt',
      episodes: 'id, showId, [showId+seasonNumber], airDate',
      // watches keyed by episodeId => re-importing can never duplicate a watch.
      watches: 'episodeId, showId, watchedAt, [showId+seasonNumber]',
    });
    // v2 adds user-created lists.
    this.version(2).stores({
      lists: 'id, createdAt',
    });
    // v3 adds movie tracking (separate from TV shows/episodes).
    this.version(3).stores({
      movies: 'id, addedAt, watchedAt',
    });
  }
}

export const db = new ShowTrackDB();
