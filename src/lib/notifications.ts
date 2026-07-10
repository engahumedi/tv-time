// Notifications: a small aggregation over three signals —
//   1. someone asked to follow you (private account)      → 'request'
//   2. someone started following you                       → 'follow'
//   3. a new episode aired for a show in your library      → 'episode'
// Follow signals come from Supabase (only when signed in); episode signals are
// computed locally from the Dexie cache, so they work offline. "Unread" is
// tracked with a single last-seen timestamp in localStorage.

import { useEffect, useState, useCallback } from 'react';
import { db } from './db';
import { followerActivity } from './social';
import type { Profile } from '../types';

export type NotifType = 'request' | 'follow' | 'episode';

export interface Notif {
  id: string;
  type: NotifType;
  ts: number;
  // follow / request
  profile?: Profile;
  // episode
  showId?: number;
  showName?: string;
  posterPath?: string | null;
  season?: number;
  episode?: number;
  episodeName?: string;
}

const SEEN_KEY = 'notifsLastSeen';
const SEEN_EVENT = 'notifs-seen';
// Only surface episodes that aired within this window (recently-dropped).
const EPISODE_WINDOW_MS = 21 * 864e5;

export function getLastSeen(): number {
  return Number(localStorage.getItem(SEEN_KEY) || 0);
}

export function markAllSeen(ts: number = Date.now()): void {
  localStorage.setItem(SEEN_KEY, String(ts));
  window.dispatchEvent(new Event(SEEN_EVENT));
}

/** Recently-aired, still-unwatched episodes from shows in the library. */
async function episodeNotifs(): Promise<Notif[]> {
  const now = Date.now();
  const since = now - EPISODE_WINDOW_MS;
  const shows = await db.shows.toArray();
  if (shows.length === 0) return [];
  const showById = new Map(shows.map((s) => [s.id, s]));
  const watched = new Set((await db.watches.toArray()).map((w) => w.episodeId));
  const out: Notif[] = [];
  for (const show of shows) {
    const eps = await db.episodes.where('showId').equals(show.id).toArray();
    for (const e of eps) {
      if (!e.airDate) continue;
      const ts = new Date(e.airDate).getTime();
      if (Number.isNaN(ts) || ts < since || ts > now) continue;
      if (watched.has(e.id)) continue;
      const s = showById.get(show.id)!;
      out.push({
        id: `ep:${e.id}`,
        type: 'episode',
        ts,
        showId: show.id,
        showName: s.name,
        posterPath: s.posterPath,
        season: e.seasonNumber,
        episode: e.episodeNumber,
        episodeName: e.name,
      });
    }
  }
  return out;
}

/** Follow requests + new followers from the cloud (empty when signed out). */
async function followNotifs(): Promise<Notif[]> {
  try {
    const events = await followerActivity();
    return events.map((ev) => ({
      id: `${ev.pending ? 'req' : 'fol'}:${ev.profile.id}`,
      type: ev.pending ? 'request' : 'follow',
      ts: ev.ts,
      profile: ev.profile,
    }));
  } catch {
    return [];
  }
}

export async function loadNotifs(): Promise<Notif[]> {
  const [follows, episodes] = await Promise.all([followNotifs(), episodeNotifs()]);
  return [...follows, ...episodes].sort((a, b) => b.ts - a.ts).slice(0, 60);
}

/**
 * Loads notifications and tracks the unread count. Re-fetches when the tab
 * regains focus and when the last-seen marker changes (so the badge clears
 * as soon as the page is opened).
 */
export function useNotifications() {
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const [lastSeen, setLastSeen] = useState(getLastSeen);

  const refresh = useCallback(() => {
    loadNotifs().then(setNotifs).catch(() => setNotifs([]));
  }, []);

  useEffect(() => {
    refresh();
    const onSeen = () => setLastSeen(getLastSeen());
    const onFocus = () => refresh();
    window.addEventListener(SEEN_EVENT, onSeen);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener(SEEN_EVENT, onSeen);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const unread = (notifs ?? []).filter((n) => n.ts > lastSeen).length;
  return { notifs, unread, refresh };
}
