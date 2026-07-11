-- ShowTrack cloud schema.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It creates the two per-user tables and locks them down so each account can
-- only ever read/write its own rows (Row Level Security).

create table if not exists public.shows (
  user_id  uuid    not null references auth.users (id) on delete cascade,
  show_id  bigint  not null,
  status   text    not null default 'not_started',
  added_at bigint  not null default 0,
  payload  jsonb   not null,
  primary key (user_id, show_id)
);

create table if not exists public.watches (
  user_id    uuid   not null references auth.users (id) on delete cascade,
  episode_id text   not null,
  show_id    bigint not null,
  season     int    not null default 1,
  episode    int    not null default 0,
  watched_at bigint not null default 0,
  runtime    int    not null default 0,
  rating     int,
  note       text,
  source     text   not null default 'import',
  plays      int    not null default 1,
  primary key (user_id, episode_id)
);
-- Re-watch count (added later); safe to run on an existing table.
alter table public.watches add column if not exists plays int not null default 1;

create table if not exists public.lists (
  id         text   not null,
  user_id    uuid   not null references auth.users (id) on delete cascade,
  name       text   not null,
  show_ids   jsonb  not null default '[]'::jsonb,
  created_at bigint not null default 0,
  kind       text   not null default 'show',
  primary key (user_id, id)
);
-- Older deployments: add the list kind column if it's missing.
alter table public.lists add column if not exists kind text not null default 'show';

create table if not exists public.movies (
  user_id    uuid    not null references auth.users (id) on delete cascade,
  movie_id   bigint  not null,
  watched    boolean not null default false,
  watched_at bigint,
  added_at   bigint  not null default 0,
  payload    jsonb   not null,
  primary key (user_id, movie_id)
);

create index if not exists watches_user_show_idx
  on public.watches (user_id, show_id);

-- Row Level Security: every row is private to its owner.
alter table public.shows   enable row level security;
alter table public.watches enable row level security;
alter table public.lists   enable row level security;
alter table public.movies  enable row level security;

drop policy if exists "own shows" on public.shows;
create policy "own shows" on public.shows
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own watches" on public.watches;
create policy "own watches" on public.watches
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own lists" on public.lists;
create policy "own lists" on public.lists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own movies" on public.movies;
create policy "own movies" on public.movies
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Social layer: public/private profiles + follow-with-approval
-- ============================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique not null,
  display_name text,
  avatar_url   text,
  is_public    boolean not null default false,
  created_at   bigint not null default 0
);

create table if not exists public.follows (
  follower_id  uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending',
  created_at   bigint not null default 0,
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx  on public.follows (follower_id);
-- Case-insensitive uniqueness on username (also serves case-insensitive
-- lookups). The DB enforces this regardless of client normalization, so
-- "Bob" and "bob" can never coexist even via a raw API call.
create unique index if not exists profiles_username_lower_uniq on public.profiles (lower(username));

-- Can the current user view `target`'s data? own / public / accepted follower.
create or replace function public.can_view(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    target = auth.uid()
    or exists (select 1 from public.profiles p where p.id = target and p.is_public)
    or exists (select 1 from public.follows f
               where f.following_id = target and f.follower_id = auth.uid()
                 and f.status = 'accepted');
$$;

-- Force follow status server-side: auto-accept public targets, else pending.
-- Prevents a client from self-inserting status='accepted' on a private account.
create or replace function public.set_follow_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = new.following_id and is_public) then
    new.status := 'accepted';
  else
    new.status := 'pending';
  end if;
  new.created_at := (extract(epoch from now()) * 1000)::bigint;
  return new;
end;
$$;
drop trigger if exists follows_set_status on public.follows;
create trigger follows_set_status before insert on public.follows
  for each row execute function public.set_follow_status();

-- Auto-create a profile for every new user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, created_at)
  values (
    new.id,
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    (extract(epoch from now()) * 1000)::bigint
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing users.
insert into public.profiles (id, username, display_name, created_at)
select u.id,
       'user_' || substr(replace(u.id::text, '-', ''), 1, 8),
       coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       (extract(epoch from now()) * 1000)::bigint
from auth.users u
on conflict (id) do nothing;

-- RLS: profiles (any authenticated user may read the public directory).
alter table public.profiles enable row level security;
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (auth.uid() is not null);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- RLS: follows.
alter table public.follows enable row level security;
drop policy if exists "follows involved read" on public.follows;
create policy "follows involved read" on public.follows for select
  using (follower_id = auth.uid() or following_id = auth.uid());
drop policy if exists "create own follow" on public.follows;
create policy "create own follow" on public.follows for insert
  with check (follower_id = auth.uid());
drop policy if exists "target updates status" on public.follows;
create policy "target updates status" on public.follows for update
  using (following_id = auth.uid()) with check (following_id = auth.uid());
drop policy if exists "either party unfollows" on public.follows;
create policy "either party unfollows" on public.follows for delete
  using (follower_id = auth.uid() or following_id = auth.uid());

-- Widen SELECT on the data tables to viewable profiles (writes stay owner-only
-- via the existing "own X" for-all policies).
drop policy if exists "view shows" on public.shows;
create policy "view shows" on public.shows for select using (public.can_view(user_id));
drop policy if exists "view watches" on public.watches;
create policy "view watches" on public.watches for select using (public.can_view(user_id));
drop policy if exists "view lists" on public.lists;
create policy "view lists" on public.lists for select using (public.can_view(user_id));
drop policy if exists "view movies" on public.movies;
create policy "view movies" on public.movies for select using (public.can_view(user_id));

-- Follower/following counts (public) + member lists (privacy-gated via can_view).

create or replace function public.follow_counts(target uuid)
returns table(followers integer, following integer)
language sql security definer stable set search_path = public as $$
  select
    (select count(*) from public.follows where following_id = target and status = 'accepted')::int,
    (select count(*) from public.follows where follower_id  = target and status = 'accepted')::int;
$$;

create or replace function public.follow_list(target uuid, kind text)
returns setof public.profiles
language sql security definer stable set search_path = public as $$
  select p.* from public.profiles p
  where public.can_view(target)
    and (
      (kind = 'followers' and p.id in (select follower_id  from public.follows where following_id = target and status = 'accepted'))
      or
      (kind = 'following' and p.id in (select following_id from public.follows where follower_id  = target and status = 'accepted'))
    );
$$;

grant execute on function public.follow_counts(uuid) to authenticated, anon;
grant execute on function public.follow_list(uuid, text) to authenticated, anon;
-- ============================================================
-- Social layer v3: accepted_at, blocks, notif seen, avatars
-- ============================================================

-- 1) accepted_at on follows: set ONLY when a pending request is approved
--    (public auto-accepts leave it null), so we can notify "X accepted you".
alter table public.follows add column if not exists accepted_at bigint;

-- Recreate set_follow_status: reject follows between blocked users, auto-accept
-- public targets (accepted_at stays null → not a manual approval), else pending.
create or replace function public.set_follow_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = new.following_id and b.blocked_id = new.follower_id)
       or (b.blocker_id = new.follower_id and b.blocked_id = new.following_id)
  ) then
    raise exception 'blocked';
  end if;
  if exists (select 1 from public.profiles where id = new.following_id and is_public) then
    new.status := 'accepted';
  else
    new.status := 'pending';
  end if;
  new.created_at := (extract(epoch from now()) * 1000)::bigint;
  return new;
end;
$$;

-- Stamp accepted_at the moment a pending follow flips to accepted.
create or replace function public.mark_follow_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and coalesce(old.status, '') <> 'accepted' then
    new.accepted_at := (extract(epoch from now()) * 1000)::bigint;
  end if;
  return new;
end;
$$;
drop trigger if exists follows_mark_accepted on public.follows;
create trigger follows_mark_accepted before update on public.follows
  for each row execute function public.mark_follow_accepted();

-- 2) Blocks.
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at bigint not null default 0,
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "own blocks read" on public.blocks;
create policy "own blocks read" on public.blocks for select using (blocker_id = auth.uid());
drop policy if exists "create own block" on public.blocks;
create policy "create own block" on public.blocks for insert with check (blocker_id = auth.uid());
drop policy if exists "delete own block" on public.blocks;
create policy "delete own block" on public.blocks for delete using (blocker_id = auth.uid());

-- Blocking someone severs any follow relationship both ways.
create or replace function public.sever_on_block()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;
drop trigger if exists blocks_sever on public.blocks;
create trigger blocks_sever after insert on public.blocks
  for each row execute function public.sever_on_block();

-- 3) can_view now also denies when either party has blocked the other.
create or replace function public.can_view(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    not exists (
      select 1 from public.blocks b
      where (b.blocker_id = target and b.blocked_id = auth.uid())
         or (b.blocker_id = auth.uid() and b.blocked_id = target)
    )
    and (
      target = auth.uid()
      or exists (select 1 from public.profiles p where p.id = target and p.is_public)
      or exists (select 1 from public.follows f
                 where f.following_id = target and f.follower_id = auth.uid()
                   and f.status = 'accepted')
    );
$$;

-- 4) Cross-device "notifications seen" marker.
alter table public.profiles add column if not exists notifs_seen_at bigint not null default 0;

-- 5) Avatars storage bucket (public read, owner-only writes under {uid}/…).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar public read" on storage.objects;
create policy "avatar public read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatar owner insert" on storage.objects;
create policy "avatar owner insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar owner update" on storage.objects;
create policy "avatar owner update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatar owner delete" on storage.objects;
create policy "avatar owner delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- ============================================================
-- Social layer v4: episode reactions + activity likes/comments
-- ============================================================

-- Stamp created_at (ms) server-side so we never trust the client for ordering.
create or replace function public.stamp_created_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.created_at := (extract(epoch from now()) * 1000)::bigint;
  return new;
end;
$$;

-- 1) Per-user reaction/comment on a specific episode (one per user per episode).
create table if not exists public.episode_reactions (
  user_id    uuid   not null references auth.users (id) on delete cascade,
  episode_id text   not null,
  show_id    bigint not null,
  emoji      text,
  body       text,
  created_at bigint not null default 0,
  primary key (user_id, episode_id)
);
create index if not exists episode_reactions_ep_idx on public.episode_reactions (episode_id);
alter table public.episode_reactions enable row level security;
drop trigger if exists episode_reactions_stamp on public.episode_reactions;
create trigger episode_reactions_stamp before insert on public.episode_reactions
  for each row execute function public.stamp_created_at();
drop policy if exists "reactions viewable" on public.episode_reactions;
create policy "reactions viewable" on public.episode_reactions for select using (public.can_view(user_id));
drop policy if exists "own reaction insert" on public.episode_reactions;
create policy "own reaction insert" on public.episode_reactions for insert with check (user_id = auth.uid());
drop policy if exists "own reaction update" on public.episode_reactions;
create policy "own reaction update" on public.episode_reactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own reaction delete" on public.episode_reactions;
create policy "own reaction delete" on public.episode_reactions for delete using (user_id = auth.uid());

-- 2) Likes on a feed activity. activity_id is an opaque client string; owner_id
--    is the person whose activity it is, so RLS can gate by can_view(owner).
create table if not exists public.activity_likes (
  actor_id    uuid not null references auth.users (id) on delete cascade,
  activity_id text not null,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  created_at  bigint not null default 0,
  primary key (actor_id, activity_id)
);
create index if not exists activity_likes_act_idx on public.activity_likes (activity_id);
alter table public.activity_likes enable row level security;
drop trigger if exists activity_likes_stamp on public.activity_likes;
create trigger activity_likes_stamp before insert on public.activity_likes
  for each row execute function public.stamp_created_at();
drop policy if exists "likes viewable" on public.activity_likes;
create policy "likes viewable" on public.activity_likes for select using (public.can_view(owner_id));
drop policy if exists "own like insert" on public.activity_likes;
create policy "own like insert" on public.activity_likes for insert
  with check (actor_id = auth.uid() and public.can_view(owner_id));
drop policy if exists "own like delete" on public.activity_likes;
create policy "own like delete" on public.activity_likes for delete using (actor_id = auth.uid());

-- 3) Comments on a feed activity.
create table if not exists public.activity_comments (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references auth.users (id) on delete cascade,
  activity_id text not null,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  body        text not null,
  created_at  bigint not null default 0
);
create index if not exists activity_comments_act_idx on public.activity_comments (activity_id);
alter table public.activity_comments enable row level security;
drop trigger if exists activity_comments_stamp on public.activity_comments;
create trigger activity_comments_stamp before insert on public.activity_comments
  for each row execute function public.stamp_created_at();
drop policy if exists "comments viewable" on public.activity_comments;
create policy "comments viewable" on public.activity_comments for select using (public.can_view(owner_id));
drop policy if exists "own comment insert" on public.activity_comments;
create policy "own comment insert" on public.activity_comments for insert
  with check (actor_id = auth.uid() and public.can_view(owner_id));
drop policy if exists "own comment delete" on public.activity_comments;
create policy "own comment delete" on public.activity_comments for delete using (actor_id = auth.uid());
