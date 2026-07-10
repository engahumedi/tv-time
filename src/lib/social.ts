// Social layer: public/private profiles + follow-with-approval. All reads are
// gated server-side by Row Level Security (see supabase/schema.sql), so the
// client can only ever fetch data it's actually allowed to see.

import { supabase } from './supabase';
import type { Show, Movie, WatchRecord, ShowList, Profile } from '../types';

export type FollowStatus = 'none' | 'pending' | 'accepted';

/** Fired whenever a follow/block relationship changes, so counts + lists refetch. */
const CHANGED_EVENT = 'social-changed';
function emitChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED_EVENT));
}
export function onSocialChanged(fn: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, fn);
  return () => window.removeEventListener(CHANGED_EVENT, fn);
}

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

/** The follow status + target visibility + whether I've blocked them. */
export async function getRelation(
  targetId: string,
): Promise<{ status: FollowStatus; targetPublic: boolean; iBlocked: boolean }> {
  if (!supabase) return { status: 'none', targetPublic: false, iBlocked: false };
  const uid = await myId();
  const [{ data: prof }, { data: rel }, blk] = await Promise.all([
    supabase.from('profiles').select('is_public').eq('id', targetId).maybeSingle(),
    uid
      ? supabase.from('follows').select('status').eq('follower_id', uid).eq('following_id', targetId).maybeSingle()
      : Promise.resolve({ data: null }),
    uid
      ? supabase.from('blocks').select('blocked_id').eq('blocker_id', uid).eq('blocked_id', targetId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    status: (rel?.status as FollowStatus) ?? 'none',
    targetPublic: !!prof?.is_public,
    iBlocked: !!blk.data,
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
  emitChanged();
  return (data?.status as FollowStatus) ?? 'pending';
}

export async function unfollow(targetId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('follows').delete().eq('follower_id', uid).eq('following_id', targetId);
  emitChanged();
}

/** Remove someone who follows me (kick them out of my followers). */
export async function removeFollower(followerId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', uid);
  emitChanged();
}

/** My outgoing follow requests still awaiting approval (private targets). */
export async function outgoingRequests(): Promise<Profile[]> {
  if (!supabase) return [];
  const uid = await myId();
  if (!uid) return [];
  const { data: rows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', uid)
    .eq('status', 'pending');
  const ids = (rows ?? []).map((r) => r.following_id as string);
  if (ids.length === 0) return [];
  const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
  return (profs ?? []).map((r) => toProfile(r as ProfileRow));
}

/** Map of everyone I follow / requested → status, for annotating lists. */
export async function myFollowMap(): Promise<Map<string, FollowStatus>> {
  const m = new Map<string, FollowStatus>();
  if (!supabase) return m;
  const uid = await myId();
  if (!uid) return m;
  const { data } = await supabase.from('follows').select('following_id, status').eq('follower_id', uid);
  for (const r of data ?? []) m.set(r.following_id as string, r.status as FollowStatus);
  return m;
}

/** Block / unblock a user (severs follows both ways server-side). */
export async function block(targetId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('blocks').insert({ blocker_id: uid, blocked_id: targetId });
  emitChanged();
}
export async function unblock(targetId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('blocks').delete().eq('blocker_id', uid).eq('blocked_id', targetId);
  emitChanged();
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

export interface FollowEvent {
  profile: Profile;
  ts: number;
  /** pending = they requested to follow you; accepted = they now follow you. */
  pending: boolean;
}

/** Everyone who follows (or asked to follow) me, with when it happened. */
export async function followerActivity(): Promise<FollowEvent[]> {
  if (!supabase) return [];
  const uid = await myId();
  if (!uid) return [];
  const { data: rows } = await supabase
    .from('follows')
    .select('follower_id, status, created_at')
    .eq('following_id', uid);
  const list = rows ?? [];
  if (list.length === 0) return [];
  const ids = list.map((r) => r.follower_id as string);
  const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
  const byId = new Map((profs ?? []).map((p) => [p.id as string, toProfile(p as ProfileRow)]));
  return list
    .map((r) => {
      const profile = byId.get(r.follower_id as string);
      if (!profile) return null;
      return {
        profile,
        ts: Number(r.created_at ?? 0),
        pending: (r.status as string) !== 'accepted',
      };
    })
    .filter((x): x is FollowEvent => x !== null);
}

export async function acceptRequest(followerId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('follows').update({ status: 'accepted' }).eq('follower_id', followerId).eq('following_id', uid);
  emitChanged();
}

export async function rejectRequest(followerId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', uid);
  emitChanged();
}

/** Private accounts I asked to follow that have now approved me (for notifs). */
export async function acceptedFollows(): Promise<FollowEvent[]> {
  if (!supabase) return [];
  const uid = await myId();
  if (!uid) return [];
  const { data: rows } = await supabase
    .from('follows')
    .select('following_id, accepted_at')
    .eq('follower_id', uid)
    .eq('status', 'accepted')
    .not('accepted_at', 'is', null);
  const list = (rows ?? []).filter((r) => Number(r.accepted_at) > 0);
  if (list.length === 0) return [];
  const ids = list.map((r) => r.following_id as string);
  const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
  const byId = new Map((profs ?? []).map((p) => [p.id as string, toProfile(p as ProfileRow)]));
  return list
    .map((r) => {
      const profile = byId.get(r.following_id as string);
      return profile ? { profile, ts: Number(r.accepted_at), pending: false } : null;
    })
    .filter((x): x is FollowEvent => x !== null);
}

/** Cross-device "notifications last seen" marker stored on the profile. */
export async function getNotifsSeen(): Promise<number> {
  if (!supabase) return 0;
  const uid = await myId();
  if (!uid) return 0;
  const { data } = await supabase.from('profiles').select('notifs_seen_at').eq('id', uid).maybeSingle();
  return Number(data?.notifs_seen_at ?? 0);
}
export async function setNotifsSeen(ts: number): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('profiles').update({ notifs_seen_at: ts }).eq('id', uid);
}

/**
 * Upload an avatar image and save its public URL on my profile.
 * Stored under `{uid}/…` so the storage RLS lets only the owner write it.
 */
export async function uploadAvatar(file: File): Promise<{ url?: string; error?: string }> {
  if (!supabase) return { error: 'generic' };
  const uid = await myId();
  if (!uid) return { error: 'generic' };
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${uid}/avatar.${ext}`;
  const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) return { error: 'generic' };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`; // cache-bust on replace
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', uid);
  if (error) return { error: 'generic' };
  emitChanged();
  return { url };
}

/** Follower/following counts for a user (public info, via SECURITY DEFINER fn). */
export async function followCounts(id: string): Promise<{ followers: number; following: number }> {
  if (!supabase) return { followers: 0, following: 0 };
  const { data } = await supabase.rpc('follow_counts', { target: id });
  const row = Array.isArray(data) ? data[0] : data;
  return {
    followers: Number(row?.followers ?? 0),
    following: Number(row?.following ?? 0),
  };
}

/** The list of a user's followers or following (privacy-gated server-side). */
export async function followList(id: string, kind: 'followers' | 'following'): Promise<Profile[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc('follow_list', { target: id, kind });
  return (data ?? []).map((r: ProfileRow) => toProfile(r));
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

/* ---------------- Episode reactions ---------------- */

export interface EpisodeReaction {
  profile: Profile;
  emoji: string | null;
  body: string | null;
  createdAt: number;
}

/** All viewable reactions for an episode (mine + friends'), newest first. */
export async function episodeReactions(episodeId: string): Promise<EpisodeReaction[]> {
  if (!supabase) return [];
  const { data: rows } = await supabase
    .from('episode_reactions')
    .select('user_id, emoji, body, created_at')
    .eq('episode_id', episodeId)
    .order('created_at', { ascending: false });
  const list = rows ?? [];
  if (list.length === 0) return [];
  const ids = list.map((r) => r.user_id as string);
  const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
  const byId = new Map((profs ?? []).map((p) => [p.id as string, toProfile(p as ProfileRow)]));
  return list
    .map((r) => {
      const profile = byId.get(r.user_id as string);
      return profile ? { profile, emoji: r.emoji ?? null, body: r.body ?? null, createdAt: Number(r.created_at) } : null;
    })
    .filter((x): x is EpisodeReaction => x !== null);
}

/** My reaction for an episode, or null. */
export async function myEpisodeReaction(episodeId: string): Promise<{ emoji: string | null; body: string | null } | null> {
  if (!supabase) return null;
  const uid = await myId();
  if (!uid) return null;
  const { data } = await supabase
    .from('episode_reactions')
    .select('emoji, body')
    .eq('user_id', uid)
    .eq('episode_id', episodeId)
    .maybeSingle();
  return data ? { emoji: data.emoji ?? null, body: data.body ?? null } : null;
}

/** Create/update or clear my reaction for an episode. */
export async function saveEpisodeReaction(
  episodeId: string,
  showId: number,
  patch: { emoji?: string | null; body?: string | null },
): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  const emoji = patch.emoji ?? null;
  const body = (patch.body ?? '').trim() || null;
  if (!emoji && !body) {
    await supabase.from('episode_reactions').delete().eq('user_id', uid).eq('episode_id', episodeId);
    return;
  }
  await supabase.from('episode_reactions').upsert(
    { user_id: uid, episode_id: episodeId, show_id: showId, emoji, body },
    { onConflict: 'user_id,episode_id' },
  );
}

/* ---------------- Activity likes + comments ---------------- */

export interface ActivitySocial {
  likes: number;
  likedByMe: boolean;
  comments: ActivityComment[];
}
export interface ActivityComment {
  id: string;
  profile: Profile;
  body: string;
  createdAt: number;
  mine: boolean;
}

/** Likes + comments for a batch of activities (keyed by activity_id). */
export async function activitySocial(activityIds: string[]): Promise<Map<string, ActivitySocial>> {
  const out = new Map<string, ActivitySocial>();
  if (!supabase || activityIds.length === 0) return out;
  const uid = await myId();
  for (const id of activityIds) out.set(id, { likes: 0, likedByMe: false, comments: [] });

  const [likesRes, commentsRes] = await Promise.all([
    supabase.from('activity_likes').select('activity_id, actor_id').in('activity_id', activityIds),
    supabase.from('activity_comments').select('id, activity_id, actor_id, body, created_at').in('activity_id', activityIds).order('created_at', { ascending: true }),
  ]);

  const actorIds = new Set<string>();
  for (const r of commentsRes.data ?? []) actorIds.add(r.actor_id as string);
  const { data: profs } = actorIds.size
    ? await supabase.from('profiles').select('*').in('id', [...actorIds])
    : { data: [] as ProfileRow[] };
  const byId = new Map((profs ?? []).map((p) => [p.id as string, toProfile(p as ProfileRow)]));

  for (const r of likesRes.data ?? []) {
    const e = out.get(r.activity_id as string)!;
    e.likes += 1;
    if (r.actor_id === uid) e.likedByMe = true;
  }
  for (const r of commentsRes.data ?? []) {
    const e = out.get(r.activity_id as string);
    const profile = byId.get(r.actor_id as string);
    if (!e || !profile) continue;
    e.comments.push({ id: r.id as string, profile, body: r.body as string, createdAt: Number(r.created_at), mine: r.actor_id === uid });
  }
  return out;
}

export async function likeActivity(activityId: string, ownerId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('activity_likes').insert({ actor_id: uid, activity_id: activityId, owner_id: ownerId });
}
export async function unlikeActivity(activityId: string): Promise<void> {
  if (!supabase) return;
  const uid = await myId();
  if (!uid) return;
  await supabase.from('activity_likes').delete().eq('actor_id', uid).eq('activity_id', activityId);
}
export async function commentActivity(activityId: string, ownerId: string, body: string): Promise<ActivityComment | null> {
  if (!supabase) return null;
  const uid = await myId();
  if (!uid) return null;
  const text = body.trim();
  if (!text) return null;
  const { data, error } = await supabase
    .from('activity_comments')
    .insert({ actor_id: uid, activity_id: activityId, owner_id: ownerId, body: text })
    .select('id, created_at')
    .maybeSingle();
  if (error || !data) return null;
  const me = await getMyProfile();
  if (!me) return null;
  return { id: data.id as string, profile: me, body: text, createdAt: Number(data.created_at), mine: true };
}
export async function deleteComment(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('activity_comments').delete().eq('id', id);
}

export interface FeedItem {
  id: string;
  user: Profile;
  kind: 'episode' | 'movie';
  ts: number;
  title: string;
  poster: string | null;
  season?: number;
  episode?: number;
  showId?: number;
  movieId?: number;
}

/**
 * Recent watch activity from the people I follow. RLS on watches/movies/shows
 * already restricts this to profiles I'm allowed to see, so it's safe to query
 * directly by the set of ids I follow.
 */
export async function friendsFeed(): Promise<FeedItem[]> {
  if (!supabase) return [];
  const uid = await myId();
  if (!uid) return [];
  const following = await followList(uid, 'following');
  if (following.length === 0) return [];
  const byId = new Map(following.map((p) => [p.id, p]));
  const ids = following.map((p) => p.id);
  const key = (u: string, s: number | string) => `${u}:${s}`;

  const [watchesRes, moviesRes, showsRes] = await Promise.all([
    supabase.from('watches').select('user_id, show_id, episode_id, season, episode, watched_at')
      .in('user_id', ids).order('watched_at', { ascending: false }).limit(40),
    supabase.from('movies').select('user_id, movie_id, watched_at, payload')
      .in('user_id', ids).eq('watched', true).order('watched_at', { ascending: false }).limit(40),
    supabase.from('shows').select('user_id, show_id, payload').in('user_id', ids),
  ]);

  const showByKey = new Map(
    (showsRes.data ?? []).map((r: { user_id: string; show_id: number; payload: Show }) => [key(r.user_id, r.show_id), r.payload]),
  );

  const items: FeedItem[] = [];
  for (const r of (watchesRes.data ?? []) as { user_id: string; show_id: number; episode_id: string; season: number; episode: number; watched_at: number }[]) {
    const user = byId.get(r.user_id);
    if (!user) continue;
    const show = showByKey.get(key(r.user_id, r.show_id));
    items.push({
      id: `w:${r.user_id}:${r.episode_id}`,
      user, kind: 'episode', ts: Number(r.watched_at),
      title: show?.name ?? '', poster: show?.posterPath ?? null,
      season: r.season, episode: r.episode, showId: r.show_id,
    });
  }
  for (const r of (moviesRes.data ?? []) as { user_id: string; movie_id: number; watched_at: number | null; payload: Movie }[]) {
    const user = byId.get(r.user_id);
    if (!user) continue;
    items.push({
      id: `m:${r.user_id}:${r.movie_id}`,
      user, kind: 'movie', ts: Number(r.watched_at ?? 0),
      title: r.payload?.title ?? '', poster: r.payload?.posterPath ?? null,
      movieId: r.movie_id,
    });
  }
  return items.sort((a, b) => b.ts - a.ts).slice(0, 40);
}
