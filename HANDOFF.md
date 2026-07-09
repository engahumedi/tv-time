# ShowTrack — Handoff / Context Document

> Paste this into a new conversation to bring the assistant fully up to speed.
> It describes what the app is, how it's built, everything that's implemented,
> the important gotchas (especially the real TV Time import format), and what's
> optionally left to do.

---

## 1. What this is

**ShowTrack** — a TV Time–style TV **and movie** tracker web app. Local-first
(works offline, no account required), with optional account sync. Bilingual
(English + Arabic with full RTL). Mobile-first but responsive to desktop.

The killer feature: **import your history from a TV Time GDPR data export** (TV
Time is shutting down), so users can bring shows, movies, and their whole watch
history over.

- **Repo:** `engahumedi/tv-time`
- **Working branch:** `claude/showtrack-tv-tracker-27fepl` (all work lands here; PR opens from it)
- **Live site (GitHub Pages):** https://engahumedi.github.io/tv-time/
- **Latest commit at handoff:** `cde9417` (Fix TV Time import against the real GDPR export format)

The owner communicates in **Arabic**; reply in Arabic by default.

---

## 2. Tech stack

- React 18 + TypeScript + Vite 6 + Tailwind CSS 3
- Routing: `react-router-dom` **HashRouter** (static hosting on Pages; base `/tv-time/` in build)
- Local storage: **Dexie** (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`)
- Backend: **Supabase** — Auth (email/password), Postgres + Row-Level-Security, and an Edge Function proxy that hides the TMDB/OMDb API keys
- Data: **TMDB** (shows, movies, people, trending, etc.) + **OMDb** (IMDb ratings), both via the proxy
- i18n: `i18next` / `react-i18next` (EN + AR), RTL via `dir` attribute on `<html>`
- Charts: `recharts`; animations: `framer-motion`; confetti: `canvas-confetti`
- Import parsing: `papaparse` (CSV) + `jszip` (ZIP)
- Icons: `lucide-react` (thin line icons — no emoji anywhere in the UI)
- Fonts: **Fraunces** (serif, headings) + **Geist** (grotesque, body) + **IBM Plex Sans Arabic**

Scripts: `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm test` (vitest), `npm run lint`.

---

## 3. Design system — "Editorial Cinema"

Dark, refined, poster-first, restrained (Criterion / A24 / Letterboxd feel).
Hard rules (already applied across the app — keep them):

1. **No emoji** in the UI — use thin `lucide-react` icons.
2. **No coloured glows / box-shadows** on buttons (neutral shadows only).
3. **Muted amber accent**, used only for small touches. Palette (dark):
   `--bg:#0a0a0b`, `--surface:#141416`, `--fg:#f5f5f4`, `--muted:#8a8a86`,
   accent amber `#c9a24b` (Tailwind token `gold`, ramp 400/500/600/700).
   Primary button = amber bg + dark ink (`text-navy-950`), no glow.
4. **Typography:** Fraunces serif headings, Geist body; Arabic keeps IBM Plex Sans Arabic + RTL.
5. **De-carded:** hairline dividers, border radius ≤ 8px (Tailwind radii capped in `tailwind.config.js`).
6. **Left-aligned / offset** layouts (onboarding is a magazine cover; empty states are offset, not centered).
7. Discover keeps the poster grid; rating badge is small/less-round/semi-transparent; active filter tabs are soft amber chips or underlines.
8. Bottom nav: thin icons, amber active + label, muted inactive, hairline top border, no glow.

Theme tokens live in `src/index.css` as space-separated RGB channels consumed via
`rgb(var(--x) / <alpha-value>)`; light/dark flipped by `data-theme` on `<html>`.
Tailwind semantic tokens: `navy.{950..600}` (surfaces), `overlay/fg/muted/faint`, `gold` (amber accent).

**Behaviour-freeze note:** a previous task restyled everything "style only" —
when doing pure redesign work, don't rename/rewire handlers, props, state, routes, or keys.

---

## 4. Architecture & key files

```
src/
  App.tsx                 Routes (HashRouter). Gates Welcome vs app; lazy-loads heavy pages.
  main.tsx                Bootstraps React + i18n + theme.
  types.ts                Domain types: Show, Episode, WatchRecord, Movie, ShowList, Parsed* , ImportSummary.
  index.css               Theme tokens, component classes (.card/.btn-gold/.chip/.input), fonts, RTL.

  lib/
    db.ts                 Dexie schema. v1 shows/episodes/watches, v2 lists, v3 movies.
    repo.ts               THE single place that mutates the DB. Show + episode + watch + list + movie writes,
                          status recompute, dedupe, bulk import; every write mirrors to cloud.* .
    hooks.ts              useLiveQuery hooks: useLibrary, useWatchList, useCalendar, useMovies, useMovie, useLists, etc.
    cloud.ts              Two-way Supabase sync (shows/watches/lists/movies). Per-action mirrors + full push/pull on login.
    tmdb.ts               TMDB client via proxy: searchShows/getShowDetail/getAllEpisodes/trending/top/genre/person/extras
                          + searchMovies/getMovieDetail/getTrendingMovies/getTopRatedMovies. `img()` builds poster URLs.
    omdb.ts               getImdbRating(imdbId) via proxy.
    supabase.ts           Supabase client; hasSupabase; functionsBase() for the proxy URL; anon key.
    auth.tsx              AuthProvider/useAuth: signIn/signUp/signOut/continueAsGuest/sendPasswordReset/updatePassword; syncAfterLogin.
    importParser.ts       Parse TV Time CSVs/ZIP -> ParsedWatch[] + ParsedMovie[]; groupBySeries/groupMovies. (See §7.)
    importer.ts           autoMatchGroups/commitImport (shows) + autoMatchMovies/commitMovies (movies).
    match.ts              normalizeTitle/titleSimilarity/bestMatch + AUTO_MATCH_THRESHOLD (0.72).
    stats.ts              computeStats (episodes/time/genres), computeBadges (milestones), breakdownTime.
    settings.ts           theme + display name (localStorage) helpers.
    exporter.ts           Export library/history to JSON/CSV.
    format.ts, ids.ts, celebrate.ts, shareCard.ts, demoData.ts

  pages/
    Home.tsx              Tabbed Watch List / Upcoming; TvTimeBanner at top; list/grid toggle; WatchRow mark-watched.
    Discover.tsx          TV Shows / Movies mode toggle; trending/top/genres/search; ShowCard + MovieCard grids; PersonModal.
    ShowDetail.tsx        Show page: ratings, seasons/episodes, status, favourite, /10 rating, tags, add-to-list, extras.
    MovieDetail.tsx       Movie page (/movie/:id): TMDB+IMDb, watched toggle, favourite, /10 rating, remove, add-to-list.
    Profile.tsx           TV Time-style profile: split Series vs Movies stats + counters, lists, favourites (shows+movies),
                          library rows, charts, milestones, Year in Review.
    Lists.tsx             My Lists with TV Shows / Movies toggle (movie lists are separate from show lists).
    Import.tsx            The importer flow (dropzone -> reading -> matching -> preview -> importing -> done).
    Settings.tsx          Account, theme (dark/light), language, display name, change password, import (with steps), export, reset.
    Wrapped.tsx           Year in Review + shareable card.
    ManualMatchModal.tsx  Manual show matching during import.

  components/  Layout, Sidebar, BottomNav, Welcome (onboarding), AuthForm, EmptyState, ShowCard, MovieCard,
               Rating, StarRating, Poster, EpisodeModal, ListPickerModal (kind-aware), TvTimeBanner, etc.

supabase/
  schema.sql              Run once in Supabase SQL editor: creates shows/watches/lists/movies + RLS policies.
  functions/api/index.ts  Edge Function proxy (Deno) that adds the TMDB/OMDb keys server-side.
```

---

## 5. Data model

### Local (Dexie — `src/lib/db.ts`)
- `shows` (key `id`) — followed TV shows.
- `episodes` (key `id = "showId:season:number"`) — episode cache (re-fetched from TMDB; not synced).
- `watches` (key `episodeId`) — a watch record per episode (dedup by episode id); has rating (1–5) + note.
- `lists` (key `id`) — user collections. Field `kind: 'show' | 'movie'` (default 'show'); `showIds` holds show OR movie ids per kind.
- `movies` (key `id`) — movies: `{ watched, watchedAt, userRating (1–10), favorite, runtime, ... }`.

### Cloud (Supabase — `supabase/schema.sql`)
Per-user tables with Row-Level-Security (each account sees only its own rows):
`shows`, `watches`, `lists` (has a `kind` column), `movies`. Episodes are NOT
synced (local cache, re-derivable from TMDB).

**Cloud sync design (`cloud.ts`):** every repo write calls a `cloud*` mirror
(no-op when signed out / Supabase absent). On sign-in, `syncAfterLogin()` does a
union merge: push all local rows up, then pull all account rows down (+ rebuild
the episode cache for pulled shows). So **sync is account-based, not
device-based** — signing in on any device restores everything. Movies were the
last table added to sync; the `movies` table + `lists.kind` column have already
been applied to the live Supabase project.

---

## 6. Backend, deploy, auth

- **Supabase project ref:** `ahibgeazsfftwzlzytah` — URL `https://ahibgeazsfftwzlzytah.supabase.co`.
- **Anon key + URL** are injected at build time by the GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The anon key is safe to expose (RLS protects data). The TMDB/OMDb keys are NOT in the client — they live in the Edge Function proxy.
- **Applying schema changes:** `supabase/schema.sql` is idempotent — run it in the Supabase SQL editor. (It can also be applied via the Supabase Management API `POST /v1/projects/{ref}/database/query` with a Personal Access Token, but **do not store that token anywhere**; the owner should keep it revoked when not actively migrating.)
- **Deploy:** push to the branch → GitHub Actions builds and deploys to Pages. Pages source must be "GitHub Actions" (not "deploy from branch"). Vite `base` is `/tv-time/` in build so assets resolve. Fastly/CDN can serve a stale edge for a bit after deploy.
- **Auth flow:** auth-first onboarding (`Welcome`) only shows when Supabase is configured and the user is neither signed in nor a guest. `continueAsGuest` sets a localStorage flag. Password reset via email link → `ResetPassword`. `updatePassword` is also used by Settings → change password.

---

## 7. TV Time import — the REAL format (important!)

Validated against a real TV Time GDPR export ZIP. Key learnings baked into
`importParser.ts` / `importer.ts`:

- The export is ~48 CSVs. **Episodes** live in `tracking-prod-records-v2.csv`
  (`series_name`, `season_number`, `episode_number`, `created_at`). **Movies**
  live in `tracking-prod-records.csv` via a **`movie_name`** column (empty
  season/episode), runtime is in **seconds** (ignored — we fetch runtime from
  TMDB on match). Episodes and movies can share a file.
- TV Time appends `series_name / movie_name / season / episode` columns to MANY
  **non-watch** files (ratings, emotions, comments, character votes,
  "where-to-watch", recommendations). Those are NOT history. We skip them with a
  filename denylist: `NON_WATCH_FILE = /vote|rating|emotion|comment|where-to-watch|recommend/i`.
- Genuine watch files: `tracking-prod-records-v2` (episodes), `tracking-prod-records`
  (movies), `watched_on_episode`, `rewatched_episode`. Extra episode column
  aliases added: `tv_show_name`, `episode_season_number`.
- Movie ids in mixed files refer to the episode, so `tmdb_id/imdb_id` were dropped
  from movie id aliases — **movies match by title** (TMDB movie search + `titleSimilarity`).
- Both parsers run on every file; the episode parser only emits rows with an
  episode number, the movie parser only emits rows with `movie_name` filled.

On the real export this yields **58 shows / ~1,090 episodes / 88 movies** with no
false positives. (Matching needs TMDB network, which is blocked in the sandbox
but works on the live site.)

Import flow (`Import.tsx`): dropzone → parse → auto-match (shows + movies) →
preview (counts, per-show match rows, manual-match) → commit → done summary.

---

## 8. Features implemented (all live)

- Track shows + episodes; "watch next" list; upcoming/calendar; mark watched; season/show bulk-watch; status.
- **Movies** as a first-class entity: Discover movie search/trending/top, MovieCard one-tap watched, MovieDetail page with TMDB+IMDb ratings, watched toggle, favourite, **1–10 rating**, remove, add-to-list.
- Ratings: 5-star per episode, /10 per show and per movie. Favourites (heart) for shows and movies. Tags + notes for shows.
- **Lists**: separate **show lists** and **movie lists** (`kind`), created/viewed under a TV Shows / Movies toggle; kind-aware "N shows / N movies" counts; add-to-list from show and movie detail pages.
- **Profile** (TV Time style): split **Series vs Movies** stats with episode + movie counters, "time watched" as one confident line, lists, favourites (shows + movies), library rows, monthly-activity + top-genre charts, milestone badges, Year in Review.
- **Home**: dismissible **TV Time farewell banner** → import; tabbed Watch List / Upcoming.
- **Settings**: account, dark/light theme, language, display name, **change password**, import (with numbered step-by-step guide), export JSON/CSV, reset.
- **Import** from TV Time (shows + movies + full history) — see §7.
- Discovery: trending/top/genres, people search + person modal, trailer/cast/recommendations on show pages.
- i18n EN/AR + RTL throughout. Light/dark theme.

---

## 9. Testing & verification (how to check work locally)

- **Unit tests:** `npm test` (vitest) — `importParser.test.ts`, `match.test.ts`, `stats.test.ts`. Keep them green.
- **Build:** `npm run build` (tsc has `noUnusedLocals` — remove unused imports/vars).
- **Browser/E2E:** Chromium is preinstalled at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; global Playwright at `/opt/node22/lib/node_modules/playwright`. Import it in an `.mjs` script as:
  ```js
  import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
  const { chromium } = pkg;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  ```
- **Dev server gotchas (sandbox):**
  - Launch detached so the Bash tool doesn't kill it: `(... npm run dev -- --port 5199 > log 2>&1 &)`.
  - **Do NOT `pkill -f vite`** — it can match and kill the tool's own shell (exit 144). Use a fresh port instead.
  - To exercise the auth/onboarding + real-data paths, launch with dummy Supabase env so `hasTmdbKey`/auth are enabled: `VITE_SUPABASE_URL="https://demo.supabase.co" VITE_SUPABASE_ANON_KEY="demo-anon-key" npm run dev -- --port 5199`.
  - **Network to external hosts (TMDB/posters) is blocked in the sandbox** — search/matching/posters won't load locally, but parsing, UI, routing, and IndexedDB all work. Seed IndexedDB directly via `page.evaluate` + a raw `indexedDB.open('showtrack')` transaction to test Profile/lists/detail with data.
  - Use the scratchpad dir for temp files. Never commit personal-data exports or temp test files that read them.

---

## 10. Gotchas / conventions

- All DB mutations go through `repo.ts`; it mirrors to `cloud.ts`. Don't write to Dexie directly from components.
- `import` flow files (`importParser.ts`, `importer.ts`, `Import.tsx`) are sensitive — test parser changes against the real format expectations in §7.
- Circular import: `repo.ts` ↔ `cloud.ts` resolved via a dynamic `import('./repo')` inside `cloud.ts`.
- i18next: interpolation var named `count` triggers plural typing — use `{{n}}` for plain string counts.
- Booleans aren't valid IndexedDB index keys — don't index boolean fields in Dexie (filter in JS).
- Commit message trailers used on this project:
  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```
- Only push to the working branch `claude/showtrack-tv-tracker-27fepl`. Use `git push -u origin <branch>` with retry/backoff on network errors.

---

## 11. Optional next steps (not started)

- **Email notifications** for new episodes (needs a Resend API key + Supabase Edge Function/cron). Discussed, not built.
- **Google sign-in** (needs the owner to create a Google OAuth Client ID/Secret in Google Cloud and add it in Supabase Auth).
- Extend `exporter.ts` to include movies in the JSON/CSV backup.
- Optional: a movies "Upcoming/coming soon" surface; movie tags/notes; import of TV Time user lists (`lists-prod-lists.csv`).

---

## 12. Security reminders

- The **Supabase Personal Access Token** the owner shared earlier (used to apply migrations) must be **revoked** in Supabase → Account → Access Tokens when not actively migrating. Never store it in the repo or in any file.
- Never commit TV Time export data (it contains the user's email, IPs, tokens). Extract only to the ephemeral scratchpad and delete after testing.
- The Supabase anon key is public by design (RLS enforces per-user access). TMDB/OMDb keys stay server-side in the Edge Function proxy.
