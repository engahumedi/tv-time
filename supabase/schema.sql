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
  source     text   not null default 'import',
  primary key (user_id, episode_id)
);

create index if not exists watches_user_show_idx
  on public.watches (user_id, show_id);

-- Row Level Security: every row is private to its owner.
alter table public.shows   enable row level security;
alter table public.watches enable row level security;

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
