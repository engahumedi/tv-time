import { supabase } from './supabase';
import { db } from './db';
import { getAllEpisodes } from './tmdb';
import type { Show, WatchRecord, ShowList, Movie } from '../types';

/**
 * Two-way sync between the local IndexedDB cache and the user's rows in
 * Supabase. `shows`, `watches`, `lists` and `movies` are synced per-account;
 * episode metadata stays a local cache that is re-fetched from the API, so we
 * never store bulky, re-derivable data in the cloud.
 *
 * Every mirror function is a no-op when signed out or when Supabase isn't
 * configured, so the offline/local-only experience is unchanged.
 */

let currentUserId: string | null = null;

export function setCloudUser(id: string | null): void {
  currentUserId = id;
}

function active(): boolean {
  return Boolean(supabase && currentUserId);
}

// ---- row <-> model mappers ----

function showToRow(show: Show) {
  return {
    user_id: currentUserId,
    show_id: show.id,
    status: show.status,
    added_at: show.addedAt,
    payload: show,
  };
}

function rowToShow(row: { status: string; added_at: number; payload: Show }): Show {
  return { ...row.payload, status: row.status as Show['status'], addedAt: row.added_at };
}

function watchToRow(w: WatchRecord) {
  return {
    user_id: currentUserId,
    episode_id: w.episodeId,
    show_id: w.showId,
    season: w.seasonNumber,
    episode: w.episodeNumber,
    watched_at: w.watchedAt,
    runtime: w.runtime,
    rating: w.rating ?? null,
    note: w.note ?? null,
    source: w.source,
  };
}

interface WatchRow {
  episode_id: string;
  show_id: number;
  season: number;
  episode: number;
  watched_at: number;
  runtime: number;
  rating: number | null;
  note: string | null;
  source: string;
}

function rowToWatch(r: WatchRow): WatchRecord {
  return {
    episodeId: r.episode_id,
    showId: r.show_id,
    seasonNumber: r.season,
    episodeNumber: r.episode,
    watchedAt: r.watched_at,
    runtime: r.runtime,
    rating: r.rating ?? undefined,
    note: r.note ?? undefined,
    source: (r.source as WatchRecord['source']) ?? 'import',
  };
}

// ---- lists ----

function listToRow(l: ShowList) {
  return {
    user_id: currentUserId,
    id: l.id,
    name: l.name,
    show_ids: l.showIds,
    created_at: l.createdAt,
    kind: l.kind ?? 'show',
  };
}

interface ListRow {
  id: string;
  name: string;
  show_ids: number[];
  created_at: number;
  kind?: 'show' | 'movie';
}

function rowToList(r: ListRow): ShowList {
  return {
    id: r.id,
    name: r.name,
    showIds: r.show_ids ?? [],
    createdAt: r.created_at,
    kind: r.kind ?? 'show',
  };
}

// ---- movies ----

function movieToRow(m: Movie) {
  return {
    user_id: currentUserId,
    movie_id: m.id,
    watched: m.watched,
    watched_at: m.watchedAt ?? null,
    added_at: m.addedAt,
    payload: m,
  };
}

function rowToMovie(row: {
  watched: boolean;
  watched_at: number | null;
  added_at: number;
  payload: Movie;
}): Movie {
  return {
    ...row.payload,
    watched: row.watched,
    watchedAt: row.watched_at ?? undefined,
    addedAt: row.added_at,
  };
}

export async function cloudUpsertMovie(movie: Movie): Promise<void> {
  if (!active()) return;
  try {
    await supabase!.from('movies').upsert(movieToRow(movie), {
      onConflict: 'user_id,movie_id',
    });
  } catch {
    /* offline / table missing — local stays source of truth */
  }
}

export async function cloudDeleteMovie(movieId: number): Promise<void> {
  if (!active()) return;
  try {
    await supabase!.from('movies').delete().match({ user_id: currentUserId, movie_id: movieId });
  } catch {
    /* ignore */
  }
}

export async function cloudUpsertList(list: ShowList): Promise<void> {
  if (!active()) return;
  try {
    await supabase!.from('lists').upsert(listToRow(list), {
      onConflict: 'user_id,id',
    });
  } catch {
    /* ignore */
  }
}

export async function cloudDeleteList(id: string): Promise<void> {
  if (!active()) return;
  try {
    await supabase!.from('lists').delete().match({ user_id: currentUserId, id });
  } catch {
    /* ignore */
  }
}

// ---- per-action mirrors (called from repo after local writes) ----

export async function cloudUpsertShow(show: Show): Promise<void> {
  if (!active()) return;
  try {
    await supabase!.from('shows').upsert(showToRow(show), {
      onConflict: 'user_id,show_id',
    });
  } catch {
    /* offline / transient — local stays source of truth */
  }
}

export async function cloudDeleteShow(showId: number): Promise<void> {
  if (!active()) return;
  try {
    await supabase!.from('shows').delete().match({ user_id: currentUserId, show_id: showId });
    await supabase!.from('watches').delete().match({ user_id: currentUserId, show_id: showId });
  } catch {
    /* ignore */
  }
}

export async function cloudUpsertWatches(records: WatchRecord[]): Promise<void> {
  if (!active() || !records.length) return;
  try {
    // Chunk to stay within request limits on large imports.
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500).map(watchToRow);
      await supabase!.from('watches').upsert(chunk, { onConflict: 'user_id,episode_id' });
    }
  } catch {
    /* ignore */
  }
}

export async function cloudDeleteWatch(episodeId: string): Promise<void> {
  if (!active()) return;
  try {
    await supabase!
      .from('watches')
      .delete()
      .match({ user_id: currentUserId, episode_id: episodeId });
  } catch {
    /* ignore */
  }
}

// ---- full sync on login ----

/** Upload everything currently in the local cache to the account (union). */
async function pushLocal(): Promise<void> {
  const [shows, watches] = await Promise.all([
    db.shows.toArray(),
    db.watches.toArray(),
  ]);
  if (shows.length) {
    await supabase!
      .from('shows')
      .upsert(shows.map(showToRow), { onConflict: 'user_id,show_id' });
  }
  await cloudUpsertWatches(watches);
  const lists = await db.lists.toArray();
  if (lists.length) {
    await supabase!
      .from('lists')
      .upsert(lists.map(listToRow), { onConflict: 'user_id,id' });
  }
  const movies = await db.movies.toArray();
  if (movies.length) {
    await supabase!
      .from('movies')
      .upsert(movies.map(movieToRow), { onConflict: 'user_id,movie_id' });
  }
}

/** Pull the account's data down and merge it into the local cache. */
async function pull(): Promise<void> {
  const [{ data: showRows }, { data: watchRows }] = await Promise.all([
    supabase!.from('shows').select('status, added_at, payload').eq('user_id', currentUserId),
    supabase!.from('watches').select('*').eq('user_id', currentUserId),
  ]);

  const shows = (showRows ?? []).map(rowToShow);
  const watches = (watchRows ?? []).map(rowToWatch);
  if (shows.length) await db.shows.bulkPut(shows);
  if (watches.length) await db.watches.bulkPut(watches);

  const { data: listRows } = await supabase!
    .from('lists')
    .select('*')
    .eq('user_id', currentUserId);
  const lists = (listRows ?? []).map(rowToList);
  if (lists.length) await db.lists.bulkPut(lists);

  const { data: movieRows } = await supabase!
    .from('movies')
    .select('watched, watched_at, added_at, payload')
    .eq('user_id', currentUserId);
  const movies = (movieRows ?? []).map(rowToMovie);
  if (movies.length) await db.movies.bulkPut(movies);

  // Imported lazily to avoid a static import cycle with repo.ts.
  const { recomputeStatus } = await import('./repo');

  // Rebuild the episode cache for any show we don't have episodes for yet,
  // so the "To Watch" feed works right after signing in on a new device.
  for (const show of shows) {
    const have = await db.episodes.where('showId').equals(show.id).count();
    if (have === 0) {
      try {
        const eps = await getAllEpisodes(show.id, show.episodeRuntime);
        if (eps.length) await db.episodes.bulkPut(eps);
      } catch {
        /* best-effort */
      }
    }
    await recomputeStatus(show.id);
  }
}

/**
 * Called right after a successful sign-in: merge local → cloud → local so no
 * data is lost in either direction (union merge; ids are stable keys).
 */
export async function syncAfterLogin(): Promise<void> {
  if (!active()) return;
  try {
    await pushLocal();
    await pull();
  } catch {
    /* leave local intact on failure */
  }
}
