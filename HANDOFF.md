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
- **Working branch:** `claude/showtrack-tv-tracker-27fepl` — this is the **only** branch on the remote and the **default** branch; GitHub Pages deploys directly from it (see `.github/workflows/deploy-pages.yml`). There is no separate `main`, so there's currently no PR (a base branch would have to be created first).
- **Live site (GitHub Pages):** https://engahumedi.github.io/tv-time/
- **Latest commit:** `2c18ccd` (Performance: split vendor chunks, preconnect CDNs, async image decoding)

> **What changed since the original handoff:** a large batch of features + fixes
> was added — see **§13 "What's new"** at the end for the full, current list.
> Sections below are kept up to date inline too.

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
    repo.ts               THE single place that mutates the DB. Show/episode/watch/list/movie writes, status recompute,
                          dedupe, bulk import; setMovieWatchlist, addItemsToList; every write mirrors to cloud.* .
    hooks.ts              useLiveQuery hooks: useLibrary, useWatchList, useCalendar, useMovies, useMovie, useLists,
                          useWatchlistMovies, useShowWatches, etc. (useEpisodeCalendar was removed with the Calendar page).
    cloud.ts              Two-way Supabase sync (shows/watches/lists/movies). movie.watchlist rides in the movie `payload`.
    tmdb.ts               TMDB client via proxy: searchShows/getShowDetail/getAllEpisodes/trending/top/genre/person/extras,
                          getRecommendations; searchMovies/getMovieDetail/getTrending/TopRatedMovies/getMovieRecommendations;
                          discoverShows/discoverMovies + getMovieGenreList (DiscoverFilters: genre/year/minRating/sort/page).
                          `img()` builds poster URLs. `hasTmdbKey` gates live features.
    omdb.ts               getImdbRating(imdbId) via proxy.
    supabase.ts           Supabase client; hasSupabase; functionsBase() for the proxy URL; anon key.
    auth.tsx              AuthProvider/useAuth: signIn/signUp/signInWithGoogle/signOut/sendPasswordReset/updatePassword;
                          syncAfterLogin. NO guest mode — an account is required.
    importParser.ts       Parse TV Time CSVs/ZIP -> ParsedWatch[] + ParsedMovie[]; groupBySeries/groupMovies. (See §7.)
    importer.ts           autoMatchGroups/commitImport (shows) + autoMatchMovies/commitMovies (movies).
    match.ts              normalizeTitle/titleSimilarity/bestMatch + AUTO_MATCH_THRESHOLD (0.72).
    stats.ts              computeStats (episodes/time/genres + perWeekday, currentStreak/longestStreak, averageRating,
                          ratedEpisodes, completionRate), computeBadges (milestones), breakdownTime.
    settings.ts           theme + display name (localStorage) helpers.
    exporter.ts           Export library/history to JSON/CSV.
    format.ts, ids.ts, celebrate.ts, shareCard.ts, demoData.ts

  pages/
    Home.tsx              Tabs: Watch List / Upcoming / Watchlist(movies). TvTimeBanner; list<->grid toggle (grid = LibraryGrid);
                          "Surprise me" dice (movie roulette). WatchRow mark-watched.
    Discover.tsx          TV Shows / Movies toggle; PERSISTENT search bar (no more Search tab); tabs Trending / Top / Filters;
                          Filters = genre + year + min-rating + sort (both kinds). ForYou rail on Trending. PersonModal.
    ShowDetail.tsx        Show page: ratings, seasons/episodes, status, favourite, /10 rating, tags, add-to-list, EpisodeRatingGraph, extras.
                          Renders from local cache even if the live fetch fails (offline-safe when in library).
    MovieDetail.tsx       Movie page (/movie/:id): TMDB+IMDb, watched toggle, want-to-watch (watchlist), favourite, /10, remove, add-to-list.
    Profile.tsx           Profile: Series & Movies stat cards SIDE BY SIDE; streak/avg-rating/completion highlights; weekday chart;
                          lists (inline create), favourites, library rows w/ "see all" -> /library, charts, milestones, Year in Review.
    Library.tsx           /library — full searchable/sortable/filterable grid of ALL shows (LibraryGrid) or movies; ?tab=movies.
    Lists.tsx             My Lists (TV Shows / Movies toggle). Inline create (NewListModal); per-list add items (ListItemsModal)
                          + remove item; empty-state CTA.
    Import.tsx            Importer flow: dropzone -> reading -> matching -> preview (collapsible ignored files, remove shows/movies)
                          -> importing (concurrent, single progress bar) -> done.
    Settings.tsx          Account, theme, language, display name, change password, import (steps), export, reset.
    Wrapped.tsx           Year in Review + shareable card.
    ManualMatchModal.tsx  Manual show matching during import.
    (Calendar.tsx was added then REMOVED — it duplicated Home's Upcoming tab.)

  components/  Layout, Sidebar, BottomNav (Home·Discover·Profile), Welcome (auth-only, no guest), AuthForm (Google + email),
               EmptyState, ShowCard, MovieCard (watched + bookmark), Rating, StarRating, Poster (lazy/async),
               EpisodeModal, EpisodeRatingGraph, LibraryGrid (search/sort/filter/bulk-select), ForYou (recs),
               RandomPickModal (movie roulette), NewListModal, ListItemsModal, BulkListModal,
               ListPickerModal (kind-aware), PersonCard/PersonModal, ShowExtras, TvTimeBanner, etc.

supabase/
  schema.sql              Run once in Supabase SQL editor: creates shows/watches/lists/movies + RLS policies.
  functions/api/index.ts  Edge Function proxy (Deno): adds TMDB/OMDb keys server-side + caches responses (edge + browser),
                          never caches errors. Deploy via Management API PATCH /v1/projects/{ref}/functions/api (JSON body:
                          {body: source, verify_jwt:false}) — use curl, not python-urllib (Cloudflare blocks its UA).
```

---

## 5. Data model

### Local (Dexie — `src/lib/db.ts`)
- `shows` (key `id`) — followed TV shows.
- `episodes` (key `id = "showId:season:number"`) — episode cache (re-fetched from TMDB; not synced).
- `watches` (key `episodeId`) — a watch record per episode (dedup by episode id); has rating (1–5) + note.
- `lists` (key `id`) — user collections. Field `kind: 'show' | 'movie'` (default 'show'); `showIds` holds show OR movie ids per kind.
- `movies` (key `id`) — movies: `{ watched, watchedAt, watchlist (want-to-watch), userRating (1–10), favorite, runtime, ... }`.

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
- **Auth flow:** account **required** — the `Welcome` screen shows whenever Supabase is configured and no user is signed in (guest mode was removed). Sign in with **email/password** or **Google** (`signInWithGoogle` → `supabase.auth.signInWithOAuth`; redirect back = app base URL). The Google provider + Client ID/Secret are configured in the Supabase dashboard, and the OAuth client + redirect (`…supabase.co/auth/v1/callback`) in Google Cloud (app published, non-sensitive scopes only). On `SIGNED_IN`, `syncAfterLogin()` runs. Password reset via email link → `ResetPassword`; `updatePassword` also used by Settings → change password.
- **TMDB/OMDb proxy caching:** the Edge Function caches successful browse/detail responses at the edge (Deno Cache API, shared) + in the browser (`Cache-Control`: 24h browse, 5 min search); failures are `no-store`. Deployed as function **v3** (`verify_jwt:false`). Cuts upstream TMDB calls and repeat invocations.

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
preview → commit → done summary. Preview improvements: the "ignored files" list
is a **collapsible one-line summary** (not a wall of filenames); each show AND
movie row has a **remove/restore** toggle so you can drop items before importing
(counts + confirm button update live). Commit runs shows (concurrency 3) then
movies (concurrency 4) with a **single continuous progress bar + "done/total"
counter**, then the clear "All done!" screen. `commitMovies` takes an
`onProgress` callback.

---

## 8. Features implemented (all live)

> This is the original baseline list. **Newer features (rating graph, library
> browser + bulk actions, movie watchlist, deeper stats, recommendations, movie
> roulette, Discover filters, Library page, list management, Google sign-in) are
> in §13.** Note the Calendar page was later removed (use Home → Upcoming).

- Track shows + episodes; "watch next" list; upcoming; mark watched; season/show bulk-watch; status.
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

- **PWA** (installable + offline) — no `manifest`/service worker yet; strong low-effort win given the local-first design.
- **"Continue watching"** rail on Home (next unwatched episode per active show).
- **Email notifications** for new episodes (needs a Resend API key + Supabase Edge Function/cron).
- Extend `exporter.ts` to include **movies** in the JSON/CSV backup (currently shows only).
- Movie **collections** (TMDB), movie **upcoming** surface, movie tags/notes, import of TV Time user lists (`lists-prod-lists.csv`).
- (Done already: Google sign-in ✅, Discover filters ✅, movie watchlist ✅, vendor code-splitting ✅.)

---

## 12. Security reminders

- The **Supabase Personal Access Token** the owner shared earlier (used to apply migrations) must be **revoked** in Supabase → Account → Access Tokens when not actively migrating. Never store it in the repo or in any file.
- Never commit TV Time export data (it contains the user's email, IPs, tokens). Extract only to the ephemeral scratchpad and delete after testing.
- The Supabase anon key is public by design (RLS enforces per-user access). TMDB/OMDb keys stay server-side in the Edge Function proxy.
- A PAT was used to deploy the Edge Function (§6) and create a demo user; it must be revoked when idle. The **service_role** key (fetchable via the Management API `…/api-keys`) is all-powerful — never print it, store it, or commit it.

---

## 13. What's new (features & changes added since the original handoff)

All built on `claude/showtrack-tv-tracker-27fepl`, each: `tsc + vite` build, `vitest` (27 tests), and driven in Chromium (seeded IndexedDB / mocked TMDB) with 0 JS errors before commit.

**Features**
- **Episode rating graph** (`components/EpisodeRatingGraph.tsx`) on ShowDetail — per-episode star ratings across the run, coloured by season, from existing `watches.rating`.
- **Library browser** (`components/LibraryGrid.tsx`) — search + sort (recent/A–Z/rating) + status filter + multi-select **bulk actions** (mark watched, add to list via `BulkListModal`, remove). Used by Home's grid tab and the Library page.
- **Movie watchlist** ("want to watch") — `Movie.watchlist`; `repo.setMovieWatchlist`; `hooks.useWatchlistMovies`; bookmark toggles on `MovieCard`/`MovieDetail`; Home **Watchlist** tab. Syncs via the movie `payload` (no schema change).
- **Deeper profile stats** — streaks, average rating, completion rate, weekday chart (`stats.ts`); Series & Movies stats rendered **side by side** (StatCard).
- **"Because you watched X"** (`components/ForYou.tsx`) — recommendation rails on Discover, seeded from the library (live TMDB only).
- **Surprise me** (`components/RandomPickModal.tsx`) — **movie roulette**: pick a genre → random movie (Shuffle/Watch). Home dice, gated on `hasTmdbKey`. (It used to pick from shows+watchlist; changed to movies-only.)
- **Discover filters** — `discoverShows`/`discoverMovies`/`getMovieGenreList` + `DiscoverFilters`; a Filters tab (genre/year/min-rating/sort) for both kinds. **Search is now a persistent bar** (no Search tab).
- **Library page** (`pages/Library.tsx`, `/library`) — "see all" from Profile; Shows/Movies toggle (`?tab=movies`).
- **Lists management** — inline create (`NewListModal`) from Profile & Lists; add/remove items per list (`ListItemsModal` + `toggleShowInList`/`addItemsToList`); empty-state CTA; live counts.
- **Google sign-in** — `auth.signInWithGoogle`; button in `AuthForm`. **Guest mode removed** (account required).

**Fixes / changes**
- Profile header: content wrapper `relative z-10` so the backdrop no longer covers the name/avatar (CSS paint order).
- ShowDetail renders from the local cache when the live fetch fails (offline-safe for in-library shows).
- Import overhaul (see §7).
- **Calendar page removed** (route, page, `useEpisodeCalendar`, nav entries) — duplicated Home's Upcoming.

**Backend / performance**
- TMDB/OMDb proxy **caching** (edge + browser, errors `no-store`), deployed as function v3 (see §6).
- Performance: **preconnect** to `image.tmdb.org` + Supabase; `loading="lazy"`/`decoding="async"` on images. ⚠️ A `manualChunks` vendor split was tried and **reverted** — splitting React into its own chunk crashed the *production* bundle at boot ("Cannot read properties of undefined (reading 'PureComponent')"), and it only reproduces in a real build (not `vite dev`). Route-level lazy imports already chunk recharts + the ZIP/CSV parsers. **Always verify a production build (`npm run build` + serve `dist` at base `/tv-time/`), not just the dev server, before shipping build-config changes.**

**Social (friends) — public/private profiles + follow-with-approval**
- Tables `profiles` (id, username unique, display_name, is_public default **false**, avatar_url) + `follows` (follower_id, following_id, status pending|accepted). RLS via `can_view(target)` = own / public / accepted-follower, applied as a `for select` policy on shows/watches/movies/lists (writes stay owner-only). A **before-insert trigger** forces follow status (public→accepted, else pending) so a client can't self-grant access; only the target may UPDATE status→accepted. `handle_new_user` trigger auto-creates a profile; existing users backfilled. Full SQL in `supabase/schema.sql`; verified with 13 live RLS security tests.
- Frontend: `lib/social.ts` (searchProfiles, follow/unfollow, incoming/accept/reject requests, getUserData, getMyProfile/saveMyProfile — all read the session via `getSession`, no network round-trip). Pages: `People.tsx` (`/people` — search + requests) and `UserProfile.tsx` (`/u/:id` — read-only friend profile, computes stats from their cloud rows; locked state for private non-followers). Settings gained username + public/private. Nav: **People** added to sidebar + bottom bar.
- Note: the sandbox **browser** can't reach Supabase (outbound blocked, same as TMDB), so the live sign-in→follow flow must be spot-checked on the deployed site; the data layer itself is proven by the server-side RLS tests.

**Where things live now (quick index):** rating graph → ShowDetail; library search/bulk → Home grid + /library; movie watchlist → MovieCard/MovieDetail + Home Watchlist tab; recs → Discover (Trending); roulette → Home dice; filters + search → Discover; lists mgmt → Lists page; Google/auth → Welcome/AuthForm; caching → `supabase/functions/api/index.ts`; social → `lib/social.ts`, `People`/`UserProfile`, Settings privacy.
