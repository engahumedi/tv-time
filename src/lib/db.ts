import Dexie, { type Table } from 'dexie';
import type { Show, Episode, WatchRecord } from '../types';

/**
 * Local-first storage. Everything the user tracks lives in IndexedDB, so the
 * app works offline and no account/backend is required. The TV Time import can
 * write tens of thousands of rows here comfortably.
 */
export class ShowTrackDB extends Dexie {
  shows!: Table<Show, number>;
  episodes!: Table<Episode, string>;
  watches!: Table<WatchRecord, string>;

  constructor() {
    super('showtrack');
    this.version(1).stores({
      // Indexes chosen for the queries the app actually runs.
      shows: 'id, name, status, addedAt',
      episodes: 'id, showId, [showId+seasonNumber], airDate',
      // watches keyed by episodeId => re-importing can never duplicate a watch.
      watches: 'episodeId, showId, watchedAt, [showId+seasonNumber]',
    });
  }
}

export const db = new ShowTrackDB();
