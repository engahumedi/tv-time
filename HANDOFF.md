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
- **Latest commit:** see `git log -1` — the branch is the source of truth.

> **What changed since the original handoff:** two large batches were added on
> top of §13 — (a) a full **social layer** (public profiles, follow-with-
> approval, feed, episode reactions, likes/comments, notifications, blocking,
> avatars, profile sharing) plus **onboarding, accent themes, account deletion**;
> and (b) **re-watches**, **avatar crop**, public-profile parity/polish, an
> Upcoming **day-countdown**, and **desktop-width** fixes. **§14 "What's new (v2)"**
> at the end has the complete current list; sections below are updated inline.

> ⚠️ **Container/branch state gotcha (important):** this session's cloud sandbox
> has twice reverted the working tree to a **stale older commit** on session
> restart, even though the remote branch is far ahead. Your pushed work is safe
> on the remote. **On a fresh session, always run
> `git fetch origin claude/showtrack-tv-tracker-27fepl` and
> `git reset --hard origin/claude/showtrack-tv-tracker-27fepl`, then `npm install`
> (newer deps like `qrcode` won't be present) before building.** Verify with
> `git log --oneline -1` that HEAD matches the latest commit above.

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
    settings.ts           theme + accent colour + display name (localStorage) helpers (ACCENTS palette).
    social.ts             Social layer: getMyProfile/saveMyProfile, getProfile/getRelation/getUserData,
                          follow/unfollow/block/unblock, uploadAvatar, follower/following counts, reactions,
                          feed likes/comments, notifications, searchProfiles. All Supabase + RLS.
    exporter.ts           Export library/history to JSON/CSV.
    format.ts, ids.ts, celebrate.ts, shareCard.ts, demoData.ts

  pages/
    Home.tsx              Tabs: Watch List / Upcoming / Watchlist(movies). TvTimeBanner; list<->grid toggle (grid = LibraryGrid);
                          "Surprise me" dice (movie roulette). WatchRow mark-watched.
    Discover.tsx          TV Shows / Movies toggle; PERSISTENT search bar (no more Search tab); tabs Trending / Top / Filters;
                          Filters = genre + year + min-rating + sort (both kinds). ForYou rail on Trending. PersonModal.
    ShowDetail.tsx        Show page: ratings, seasons/episodes, status, favourite, /10 rating, tags, add-to-list, EpisodeRatingGraph, extras.
                          Re-watches: fully-watched show button becomes "Watch whole show again" (rewatchShow); ×N badge per episode.
                          Renders from local cache even if the live fetch fails (offline-safe when in library).
    MovieDetail.tsx       Movie page (/movie/:id): TMDB+IMDb, watched toggle, want-to-watch (watchlist), favourite, /10, remove, add-to-list.
    Profile.tsx           Your profile: avatar + @username; Series & Movies stat cards SIDE BY SIDE; streak/avg-rating/completion;
                          weekday chart; lists (inline create), favourites, "Series"/"Movies" shelves w/ "see all" -> /library, share.
    People.tsx            /people — search profiles, follow requests, connections, activity feed. Exports the shared <Avatar>.
    UserProfile.tsx       /u/:id — another user's public profile: follow/approve, block; stats via shared <ProfileStats>;
                          See-all library shelves ("<name>'s shows/movies"); "You both watched" (in-common) section.
    Notifications.tsx     /notifications — follows, request-accepts, likes/comments/reactions, new-episode alerts.
    Library.tsx           /library — full searchable/sortable/filterable grid of ALL shows (LibraryGrid) or movies; ?tab=movies.
    Lists.tsx             My Lists (TV Shows / Movies toggle). Inline create (NewListModal); per-list add items (ListItemsModal)
                          + remove item; empty-state CTA.
    Import.tsx            Importer flow: dropzone -> reading -> matching -> preview (collapsible ignored files, remove shows/movies)
                          -> importing (concurrent, single progress bar) -> done.
    Settings.tsx          Account, theme, language, display name, change password, import (steps), export, reset.
    Wrapped.tsx           Year in Review + shareable card.
    ManualMatchModal.tsx  Manual show matching during import.
    (Calendar.tsx was added then REMOVED — it duplicated Home's Upcoming tab.)

  components/  Layout (responsive shell; wide desktop max-width), Sidebar, BottomNav (Home·Discover·People·Profile),
               Welcome (auth-only), AuthForm (Google + email), Onboarding (first-run), EmptyState,
               ShowCard, MovieCard (watched + bookmark), Rating, StarRating, Poster (lazy/async),
               EpisodeModal (rating, note, reactions, "Watch again"/×N re-watch controls), EpisodeReactions,
               EpisodeRatingGraph, LibraryGrid (search/sort/filter/bulk-select), ForYou (recs — seeds only from
               actually-watched shows), RandomPickModal (movie roulette; genre chips wrap on desktop),
               ProfileStats (shared Series|Movies cards + highlights, used by Profile & UserProfile),
               AvatarCropModal (crop/zoom/pan before upload), FollowStats, NotificationsBell, ShareProfileModal (QR),
               WhereToWatch (streaming providers), NewListModal, ListItemsModal, BulkListModal,
               ListPickerModal (kind-aware), PersonCard/PersonModal, ShowExtras, TvTimeBanner, etc.

supabase/
  schema.sql              Run once in Supabase SQL editor: shows/watches(+plays)/lists/movies + social tables
                          (profiles/follows/blocks/reactions/likes/comments/notifications) + RLS + SECURITY DEFINER fns.
  functions/api/index.ts  Edge Function proxy (Deno): adds TMDB/OMDb keys server-side + caches responses (edge + browser),
                          never caches errors. Deploy via Management API PATCH /v1/projects/{ref}/functions/api (JSON body:
                          {body: source, verify_jwt:false}) — use curl, not python-urllib (Cloudflare blocks its UA).
```

---

## 5. Data model

### Local (Dexie — `src/lib/db.ts`)
- `shows` (key `id`) — followed TV shows.
- `episodes` (key `id = "showId:season:number"`) — episode cache (re-fetched from TMDB; not synced).
- `watches` (key `episodeId`) — a watch record per episode (dedup by episode id); has rating (1–5) + note + **`plays`** (re-watch count; absent = 1).
- `lists` (key `id`) — user collections. Field `kind: 'show' | 'movie'` (default 'show'); `showIds` holds show OR movie ids per kind.
- `movies` (key `id`) — movies: `{ watched, watchedAt, watchlist (want-to-watch), userRating (1–10), favorite, runtime, ... }`.

### Cloud (Supabase — `supabase/schema.sql`)
Per-user tables with Row-Level-Security (each account sees only its own rows):
`shows`, `watches` (has a `plays` column — added later, `alter table … add
column if not exists`), `lists` (has a `kind` column), `movies`. Episodes are
NOT synced (local cache, re-derivable from TMDB).

**Social tables (added by the social layer, RLS-protected):** `profiles`
(username [case-insensitive unique], display_name, avatar_url, is_public),
`follows` (follower/followee + status pending/accepted, powers
follow-with-approval), `blocks`, `episode_reactions`, `activity_likes`,
`activity_comments`, and `notifications`. Avatars live in a Supabase **Storage**
bucket. A visitor reads another user's `shows`/`watches`/`movies`/`lists`
through RLS that allows it only when the target is public or the viewer is an
accepted follower. Follower/following counts and connection lists come via
`SECURITY DEFINER` SQL functions. All of this is in `supabase/schema.sql`.

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

- **Unit tests:** `npm test` (vitest, currently **36**) — `importParser.test.ts`, `match.test.ts`, `stats.test.ts`. Keep them green.
- **Build:** `npm run build` (tsc has `noUnusedLocals` — remove unused imports/vars).
- **Browser/E2E:** drive a real build with Playwright + Chromium (paths vary by
  environment; in a sandbox the browser is usually pre-installed — don't run
  `playwright install`). Always verify a **production** build (`npm run build`
  then serve `dist` at base `/tv-time/`), not just the dev server: a past
  chunking change worked in dev and blanked the page in prod.
- **Dev-server notes:** launch detached so the tooling doesn't kill it, and
  prefer a fresh port over `pkill -f vite` (that pattern can match the calling
  shell). To exercise auth/real-data paths, start with placeholder Supabase env
  vars so `hasTmdbKey`/auth switch on.
- **Sandbox networking:** outbound calls to TMDB/posters/Supabase are often
  blocked from the sandboxed browser — parsing, UI, routing and IndexedDB still
  work. Seed IndexedDB directly via `page.evaluate` to test data-driven pages.
- Keep temp files out of the repo. Never commit personal-data exports.

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
- **Email notifications** for new episodes (needs a Resend API key + Supabase Edge Function/cron) — in-app notifications already exist.
- Extend `exporter.ts` to include **movies** in the JSON/CSV backup (currently shows only).
- Movie **collections** (TMDB), movie **upcoming** surface, movie tags/notes, import of TV Time user lists (`lists-prod-lists.csv`).
- (Done already: Google sign-in ✅, Discover filters ✅, movie watchlist ✅, vendor code-splitting ✅, social layer ✅, in-app notifications ✅, onboarding ✅, accent themes ✅, account deletion ✅, re-watches ✅.)

---

## 12. Security reminders

- **Supabase Personal Access Tokens** (used to apply migrations or deploy the Edge Function) must be **revoked** in Supabase → Account → Access Tokens as soon as the work is done, and never written to the repo or any file.
- Never commit TV Time export data — it contains the user's email, IP addresses and tokens. Extract it to a temporary directory and delete it after testing.
- The Supabase anon key is public by design (RLS enforces per-user access). TMDB/OMDb keys stay server-side in the Edge Function proxy.
- The **service_role** key bypasses every RLS policy. It belongs only in GitHub Actions secrets (`SUPABASE_SERVICE_ROLE_KEY`) — never printed, committed, or pasted into chat. The **anon** key is public by design; RLS is what protects user data.

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

---

## 14. What's new (v2 — everything since §13)

Same discipline: `tsc + vite` build + `vitest` (**29 tests**) + a Chromium/mock render check with 0 JS errors before each commit. (The live Supabase-dependent paths — sign-in, follow, avatar upload — can't run in the sandbox browser; verified by build + server-side checks + deploy.)

**Social layer — completed (beyond the §13 basics)**
- **Episode reactions** (`EpisodeReactions`) and an **activity feed** with **likes + comments** (`activity_likes`, `activity_comments`). Blocking (`blocks` + block/unblock, "you blocked this user" state). **Avatars** uploaded to a Storage bucket (see crop below). **Profile sharing** via `ShareProfileModal` (link + **QR**, `qrcode` dep). **Streaming providers** ("Where to watch", `WhereToWatch`) on show pages. **In-app notifications** (`Notifications.tsx` + `NotificationsBell`): follow requests, request-accepts, and likes/comments/reactions on your content, plus new-episode alerts. **Follower/following counts + connection lists** (`FollowStats`, SECURITY DEFINER SQL fns). **Discover "Popular with people you follow"** rail. Username uniqueness is **case-insensitive** at the DB.
- **Onboarding** first-run flow (`Onboarding.tsx`), **accent-colour themes** (Settings → `ACCENTS` in `settings.ts`), and **account deletion** (`auth.deleteAccount` → Edge Function `DELETE /api/account`, wipes cloud + local).

**This session's changes**
- **Startup sync fix** (`auth.tsx`): a returning session now pulls cloud→local on app open, not only on a fresh `SIGNED_IN`. Fixes imported watches showing as unwatched / stale data on a device that was already logged in. De-duped via `syncingRef`.
- **Avatar crop** (`AvatarCropModal`): pick a photo → circular crop with drag + zoom (wheel/slider/pinch), exports a 512×512 JPEG; then uploads. Source cap raised to 15 MB.
- **@username** now shown on your own Profile (was only on others').
- **Public profile parity/polish** (`UserProfile.tsx`): stats reuse the shared `ProfileStats` (Series|Movies cards + highlights) so a visitor sees the same layout as your own profile; library & movies shelves are **"See all"**-expandable (row → full grid) and titled **"<name>'s shows/movies"** (not "your"); new **"You both watched"** in-common section (also See-all, with Series/Movies sub-headings when expanded).
- **Re-watches** (the big data-model change): `WatchRecord.plays` (+ cloud `watches.plays` column). `repo.rewatchEpisode` / `removeRewatch` / `rewatchShow`. EpisodeModal shows "Times watched ×N" with **Watch again** / remove; ShowDetail shows a ×N badge per episode and a **"Watch whole show again"** button when fully watched. `computeStats` counts each play toward episodes + minutes. Import carries re-watch counts from TV Time — `max(rows referencing the episode, explicit count column)` where the count column matches aliases like `watch_count`/`times_watched`/`plays`. `bulkImportWatches` merges by **max, not addition**, so re-uploading a file **corrects** a count and never doubles it (and backfills already-imported libraries without touching first-watch date/rating/note).
- **Upcoming day-countdown** (`Home.tsx`): each upcoming episode shows a "N days left" badge (Today/Tomorrow for the nearest).
- **"Because you watched X"** now seeds only from shows with **real watch history** (not ones merely added to the library/a watchlist).
- **Desktop width**: app shell widened on large screens (`xl:max-w-7xl`, `2xl:110rem`) and Discover result grids reach 8 cols at `2xl`, so wide windows aren't mostly empty. **Surprise-me** genre chips now **wrap** instead of scrolling horizontally (were unreachable with a mouse).
- **Profile shelves relabelled** "Series" / "Movies" (clearer than "In your library" / "Your movies"; Discover's in-library marker unchanged).
- (A **preset-avatar gallery** was added and then **removed** at the owner's request — no longer in the code.)

**Schema note:** `supabase/schema.sql` now includes `watches.plays` (idempotent `add column if not exists`); it was also applied to the live project via the Management API. All social tables were applied live earlier.

---

## 15. Ratings architecture (IMDb dataset mirror)

Poster grids show **IMDb** scores, served from our own mirror of IMDb's
official daily dataset rather than a per-title API.

- **Source:** `https://datasets.imdbws.com/title.ratings.tsv.gz` (free, official,
  daily, ~1.7M titles). Rows with **50+ votes** (612,909) are loaded into
  `public.imdb_ratings (tconst, rating, votes)`.
- **Mapping:** TMDB's list endpoints do **not** return an `imdb_id`, so the edge
  function resolves it once per title (`/movie/{id}` or `/tv/{id}/external_ids`)
  and caches it in `public.tmdb_imdb (kind, tmdb_id, imdb_id)` for every user.
- **Endpoint:** `GET /functions/v1/api/ratings?tv=1,2&movie=3` →
  `{"tv:1":9.5,...}`. Both tables are world-readable via RLS; only the service
  role writes. Response cached 6h.
- **Client:** `lib/ratings.ts` coalesces all visible cards into one request per
  tick (batch ≤100, 60ms window) and caches results for a day in localStorage.
  `components/PosterRating.tsx` fetches when a card nears the viewport and falls
  back to the TMDB star badge until/unless an IMDb score exists.
- **Measured:** coverage ~70% (OMDb) → **~93%**; a 20-title grid resolves in one
  ~1s request instead of 40.

**Reloading the dataset** (it refreshes daily; a periodic top-up keeps new
titles current): download the TSV, then batch `insert ... on conflict do update`
into `imdb_ratings`. Note the Management API rejects python-urllib's User-Agent —
send `User-Agent: curl/8.5.0`. ~1,400 rows/s at 2,500 rows per statement.

**OMDb** is still used, but only on detail pages, for **IMDb + Metacritic**
(`getExternalRatings`). **Rotten Tomatoes was removed**: measured coverage was
0% of TV series and ~30% of films via OMDb (its `tomatoes=true` parameter added
nothing, Wikidata was worse: 1/20 TV, 3/20 films), and there is no free public
RT API. MDBList is the only credible aggregator but needs a (free) API key.

---

## 16. Performance & resilience (measured)

Three fixes, each verified against the live system rather than assumed:

- **First-device sync was the slowest path in the app.** `cloud.pull()` rebuilt
  the episode cache one show at a time; each show costs a TMDB detail call plus
  one per season (**3.3s measured**), so a 58-show library took **~3.2 minutes**
  on a fresh sign-in. It now runs **6 shows concurrently** (~30s), and a failing
  show no longer stalls the rest. The worker-pool was checked for
  process-exactly-once, the concurrency cap, and error isolation.
- **Rating look-ups were cold.** `tmdb_imdb` held only 45 mappings, so the first
  viewer of any poster paid the id resolution: **3.10s** for a cold grid of 20
  vs **0.82s** warm (3.8x). `scripts/warm-imdb-mappings.mjs` walks the
  trending/top/popular lists and resolves mappings ahead of time; it runs nightly
  right after the ratings refresh. After seeding ~950 mappings a full 56-title
  Discover grid resolves in **~1.2s**.
- **No error boundary existed** — any render crash blanked the whole app (this
  actually happened once with a bad vendor chunk). `components/ErrorBoundary.tsx`
  now wraps the root and shows a reload card; its strings are hard-coded because
  i18n itself could be the thing that failed. Verified by making a component
  throw (boundary caught it, no white screen) and confirming every route still
  renders clean afterwards.

**Known, not yet done** (measured while auditing, left deliberately):
- Discover surfaces obscure titles — **29 of 100** sampled had fewer than 50
  votes. A `vote_count.gte` floor on the browse/roulette endpoints is the fix.
  (`include_adult=false` is set on search but not on the list endpoints; note
  TMDB's `adult` flag misses softcore titles, so the vote floor matters more.)
- **No PWA** — no manifest or service worker, despite the app being local-first
  and a natural fit for install + offline.
