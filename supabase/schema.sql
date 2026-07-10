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
  primary key (user_id, episode_id)
);

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
create index if not exists profiles_username_idx on public.profiles (lower(username));

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
