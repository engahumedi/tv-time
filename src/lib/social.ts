// Social layer: public/private profiles + follow-with-approval. All reads are
// gated server-side by Row Level Security (see supabase/schema.sql), so the
// client can only ever fetch data it's actually allowed to see.

import { supabase } from './supabase';
import type { Show, Movie, WatchRecord, ShowList, Profile } from '../types';

export type FollowStatus = 'none' | 'pending' | 'accepted';

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  is_public: boolean;
  avatar_url: string | null;
}

function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name || r.username,
    isPublic: !!r.is_public,
    avatarUrl: r.avatar_url,
  };
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/** Current user id from the local session (no network round-trip). */
async function myId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Normalize a username the user typed (lowercase, strip stray chars). */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export async function getMyProfile(): Promise<Profile | null> {
  if (!supabase) return null;
  const uid = await myId();
  if (!uid) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  return data ? toProfile(data as ProfileRow) : null;
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  return data ? toProfile(data as ProfileRow) : null;
}

/** Update the current user's profile. Returns an error key on failure. */
export async function saveMyProfile(patch: {
  username?: string;
  displayName?: string;
  isPublic?: boolean;
}): Promise<{ error?: 'username_taken' | 'username_invalid' | 'generic' }> {
  if (!supabase) return { error: 'generic' };
  const uid = await myId();
  if (!uid) return { error: 'generic' };

  const row: Record<string, unknown> = {};
  if (patch.username !== undefined) {
    if (!USERNAME_RE.test(patch.username)) return { error: 'username_invalid' };
    row.username = patch.username;
  }
  if (patch.displayName !== undefined) row.display_name = patch.displayName.trim() || null;
  if (patch.isPublic !== undefined) row.is_public = patch.isPublic;
  if (Object.keys(row).length === 0) return {};

  const { error } = await supabase.from('profiles').update(row).eq('id', uid);
  if (error) {
    if (error.code === '23505' || /duplicate|unique/i.test(error.message)) return { error: 'username_taken' };
    return { error: 'generic' };
  }
  return {};
}

/** Search the directory by username or display name (excludes yourself). */
export async function searchProfiles(query: string): Promise<Profile[]> {
  if (!supabase) return [];
  const q = query.trim();
  if (!q) return [];
  const uid = await myId();
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.${like},display_name.ilike.${like}`)
    .limit(25);
  return (data ?? [])
    .map((r) => toProfile(r as ProfileRow))
    .filter((p) => p.id !== uid);
}

/** The follow status + target visibility for a given user. */
export async function getRelation(
  targetId: string,
): Promise<{ status: FollowStatus; targetPublic: boolean }> {
  if (!supabase) return { status: 'none', targetPublic: false };
  const uid = await myId();
  const [{ data: prof }, { data: rel }] = await Promise.all([
    supabase.from('profiles').select('is_public').eq('id', targetId).maybeSingle(),
    uid
      ? supabase.from('follows').select('status').eq('follower_id', uid).eq('following_id', targetId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    status: (rel?.status as FollowStatus) ?? 'none',
    targetPublic: !!prof?.is_public,
  };
}

/** Follow a user. The DB trigger decides accepted (public) vs pending (private). */
export async function follow(targetId: string): Promise<FollowStatus> {
  if (!supabase) return 'none';
  const uid = await myId();
  if (!uid) return 'none';
  const { data, error } = await supabase
    .from('follows')
    .insert({ follower_id: uid, following_id: targetId })
    .select('status')
    .maybeSingle();
  if (error) return 'none';
  return (data?.status as FollowStatus) ?? 'pending';
}

export async function unfollow(targetId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('follows').delete().eq('follower_id', uid).eq('following_id', targetId);
}

/** People who've requested to follow me (pending) — for private accounts. */
export async function incomingRequests(): Promise<Profile[]> {
  if (!supabase) return [];
  const uid = await myId();
  if (!uid) return [];
  const { data: rows } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', uid)
    .eq('status', 'pending');
  const ids = (rows ?? []).map((r) => r.follower_id as string);
  if (ids.length === 0) return [];
  const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
  return (profs ?? []).map((r) => toProfile(r as ProfileRow));
}

export async function acceptRequest(followerId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', followerId).eq('following_id', uid);
}

export async function rejectRequest(followerId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', uid);
}

export interface FriendData {
  shows: Show[];
  watches: WatchRecord[];
  movies: Movie[];
  lists: ShowList[];
}

/** Fetch another user's data (RLS decides what's actually returned). */
export async function getUserData(id: string): Promise<FriendData> {
  if (!supabase) return { shows: [], watches: [], movies: [], lists: [] };
  const [showsRes, watchesRes, moviesRes, listsRes] = await Promise.all([
    supabase.from('shows').select('status, added_at, payload').eq('user_id', id),
    supabase.from('watches').select('*').eq('user_id', id),
    supabase.from('movies').select('watched, watched_at, added_at, payload').eq('user_id', id),
    supabase.from('lists').select('*').eq('user_id', id),
  ]);
  const shows: Show[] = (showsRes.data ?? []).map((r: { status: string; added_at: number; payload: Show }) => ({
    ...r.payload,
    status: r.status as Show['status'],
    addedAt: r.added_at,
  }));
  const watches: WatchRecord[] = (watchesRes.data ?? []).map((r: {
    episode_id: string; show_id: number; season: number; episode: number;
    watched_at: number; runtime: number; rating: number | null; note: string | null; source: string;
  }) => ({
    episodeId: r.episode_id,
    showId: r.show_id,
    seasonNumber: r.season,
    episodeNumber: r.episode,
    watchedAt: r.watched_at,
    runtime: r.runtime,
    rating: r.rating ?? undefined,
    note: r.note ?? undefined,
    source: (r.source as WatchRecord['source']) ?? 'import',
  }));
  const movies: Movie[] = (moviesRes.data ?? []).map((r: { watched: boolean; watched_at: number | null; added_at: number; payload: Movie }) => ({
    ...r.payload,
    watched: r.watched,
    watchedAt: r.watched_at ?? undefined,
    addedAt: r.added_at,
  }));
  const lists: ShowList[] = (listsRes.data ?? []).map((r: { id: string; name: string; show_ids: number[]; created_at: number; kind?: 'show' | 'movie' }) => ({
    id: r.id,
    name: r.name,
    showIds: r.show_ids ?? [],
    createdAt: r.created_at,
    kind: r.kind ?? 'show',
  }));
  return { shows, watches, movies, lists };
}
