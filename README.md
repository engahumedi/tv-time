# ShowTrack 📺

A TV **and movie** tracker in the spirit of TV Time — follow shows, tick off
episodes, watch your stats grow — with one killer feature: **importing your full
watch history from TV Time's official data export.**

Dark, cinematic, poster-first, mobile-first, and fully bilingual
(English / العربية with right-to-left support).

**▶ Live app: <https://engahumedi.github.io/tv-time/>**

## Features

### Track your shows
- Search any TV show and add it to your library
- Per-show status: Watching · Up to Date · Finished · Stopped · Not Started
  (derived automatically from your progress)
- Show pages with poster, backdrop, synopsis and every season & episode
- Tap to mark an episode watched — checkmark animation + a gold confetti burst
  when you finish a season or a show
- Mark a whole season or whole show at once
- **Re-watches**: log watching an episode (or a whole show) more than once
- Home shows a **To Watch** feed plus **Upcoming**, with a day countdown to each
  unaired episode
- Per-episode 5-star ratings and private notes; a rating graph across the run

### Movies
- Movies are first-class: search, watched toggle, **want-to-watch** list
- Movie pages with TMDB + IMDb ratings, favourites and a /10 rating
- **Surprise me** — a genre roulette that picks something for tonight

### Your profile & stats
- Series and Movies stats side by side: time watched, episodes, shows, films
- Streaks, average rating, completion rate, episodes-per-month and weekday charts
- Top genres, most-watched shows, milestone badges, and a Year in Review
- Shareable images for a watched episode or movie

### Friends
- Public or private profiles with a username and avatar
- Follow with approval, an activity feed, likes and comments
- Per-episode reactions, in-app notifications, blocking
- See what you and someone else have **both watched**

### Import your TV Time history — the key feature
TV Time lets you request a personal data export from its app settings, delivered
as a ZIP of CSV files. ShowTrack reads it directly:

- Drag & drop the **ZIP** (or the individual **CSV** files)
- **Auto-detects** the export layout — older `seen_episode` files, newer
  `tracking-prod-records` files, localized column names, `SxxExx` labels and
  bare Unix timestamps are all handled. It never assumes one fixed format.
- Imports **shows and movies**, matching each to the database; anything it can't
  match confidently gets a simple search-and-link screen
- **Preserves your original watch dates**, so your stats and charts reflect your
  real viewing history over the years
- Carries over **re-watch counts**
- **Re-importing the same file never creates duplicates**, and never inflates a
  count — it only corrects it
- Export your data back out anytime as JSON or CSV — you're never locked in

## Ratings

Poster grids show **IMDb** scores, served from a mirror of IMDb's
[official daily dataset](https://datasets.imdbws.com/) rather than a per-title
API — full coverage, no rate limit, and one request per grid. A nightly GitHub
Action refreshes it. Detail pages add Metacritic where available, via OMDb.

## Accounts & your data

The deployed app **requires an account** (email/password or Google). Your
library, watch history, lists and movies are stored locally in IndexedDB *and*
synced to your own rows in Supabase, protected by Row-Level Security so no other
user can read them. Signing in on any device restores everything.

Profiles are **private by default** — nothing is shared with other users until
you make your profile public or accept a follower. You can export your data at
any time, and delete your account (and everything in it) from Settings.

Self-hosting without Supabase is still supported: the app then runs purely
local-first with no account and no upload. See [SETUP.md](SETUP.md).

## Show database & "Demo mode"

ShowTrack uses [TMDB](https://www.themoviedb.org/) for shows, movies, people and
artwork, and [OMDb](https://www.omdbapi.com/) for Metacritic. In the deployed app
these keys live **server-side** in a Supabase Edge Function proxy and never reach
the browser.

For local development you can point the app straight at TMDB instead:

```bash
cp .env.example .env
# then set VITE_TMDB_API_KEY=your_key
```

**Without any key the app still runs** in *Demo mode* against a small bundled
library, so you can explore every screen.

## Tech

- **React + TypeScript + Vite**, Tailwind CSS for the dark/gold theme
- **IndexedDB** (via Dexie) — local-first; handles tens of thousands of watches
- **Supabase** — auth, Postgres + Row-Level Security, and the key-hiding proxy
- **i18next** for English/Arabic with automatic RTL
- **Recharts** for stats, **Framer Motion** + **canvas-confetti** for the feel
- **PapaParse** + **JSZip** for the importer, **qrcode** for profile sharing

## Develop

```bash
npm install
npm run dev      # start the dev server
npm test         # unit tests (parser, matcher, stats, ratings)
npm run build    # type-check + production build
npm run lint
```

### Project layout

```
src/
  lib/
    db.ts            IndexedDB schema (Dexie)
    repo.ts          all reads/writes + status derivation + dedupe
    cloud.ts         two-way Supabase sync
    auth.tsx         session, sign-in/out, account deletion
    social.ts        profiles, follows, feed, reactions, notifications
    tmdb.ts          TMDB client (proxy or direct) with demo fallback
    omdb.ts          Metacritic / IMDb lookups
    ratings.ts       batched IMDb ratings for poster grids
    importParser.ts  ZIP/CSV parsing + format auto-detection
    match.ts         fuzzy title matching
    importer.ts      auto-match + commit pipeline
    stats.ts         time/episode/genre stats + badges
    exporter.ts      JSON/CSV export
    hooks.ts         reactive queries (To Watch feed, library, …)
  components/        Layout, ErrorBoundary, cards, modals, …
  pages/             Home, Discover, ShowDetail, MovieDetail, Library, Lists,
                     Profile, People, UserProfile, Notifications, Import,
                     Settings, Wrapped
  i18n/              en / ar translations + RTL setup
supabase/
  schema.sql         tables + RLS policies (idempotent)
  functions/api/     Edge Function: TMDB/OMDb proxy + batch ratings endpoint
scripts/             nightly IMDb dataset refresh + mapping pre-warm
```
