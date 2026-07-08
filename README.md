# ShowTrack 📺

A personal TV show tracker in the spirit of TV Time — follow shows, tick off
episodes, watch your stats grow — with one killer feature: **importing your full
watch history from TV Time's official data export.**

Dark, cinematic, poster-first, mobile-first, and fully bilingual
(English / العربية with right-to-left support).

![Home](docs/home.png)

## Features

### Track your shows
- Search any TV show and add it to your library
- Per-show status: Watching · Up to Date · Finished · Stopped · Not Started
  (derived automatically from your progress)
- Show pages with poster, backdrop, synopsis and every season & episode
- Tap to mark an episode watched — checkmark animation + a gold confetti burst
  when you finish a season or a show
- Mark a whole season or whole show at once
- Home shows a **To Watch** feed: the next unwatched episode of every show you
  follow, sorted by air date

### Your profile & stats
- Total time watched in days / hours / minutes from real episode runtimes
- Episodes & shows watched
- Charts: episodes per month, top genres, most-watched shows
- Milestone badges (First Steps, Binger, Time Lord, …) with live progress

### Import your TV Time history — the key feature
TV Time lets you request a personal data export from its app settings, delivered
as a ZIP of CSV files. ShowTrack reads it directly:

- Drag & drop the **ZIP** (or the individual **CSV** files)
- **Auto-detects** the export layout — older `seen_episode` files, newer
  `tracking-prod-records` files, localized column names, `SxxExx` labels and
  bare Unix timestamps are all handled. It never assumes one fixed format.
- Matches each show to the database; anything it can't match confidently gets a
  simple search-and-link screen
- **Preserves your original watch dates**, so your stats and charts reflect your
  real viewing history over the years
- Delightful flow: upload → preview of what was found → confirm → live progress
  with posters popping in → a celebratory summary
  ("You've watched 1,240 episodes — that's 32 days of TV!")
- **Re-importing the same file never creates duplicates** (watches are keyed by
  episode)
- Export your data back out anytime as JSON or CSV — you're never locked in

## Show database & "Demo mode"

ShowTrack uses [TMDB](https://www.themoviedb.org/) as its show database. Add a
free API key to unlock real search and full imports:

```bash
cp .env.example .env
# then set VITE_TMDB_API_KEY=your_key
```

**Without a key the app still runs fully** in *Demo mode* against a small bundled
library, so you can explore every screen and even run a sample import.

## Tech

- **React + TypeScript + Vite**, Tailwind CSS for the dark/gold glass theme
- **IndexedDB** (via Dexie) — local-first, no backend or account needed; handles
  tens of thousands of watch records
- **i18next** for English/Arabic with automatic RTL
- **Recharts** for stats, **Framer Motion** + **canvas-confetti** for the feel
- **PapaParse** + **JSZip** for the importer

Everything lives in your browser. Nothing is uploaded anywhere.

## Develop

```bash
npm install
npm run dev      # start the dev server
npm test         # run unit tests (parser, matcher, stats)
npm run build    # type-check + production build
```

### Project layout

```
src/
  lib/
    db.ts            IndexedDB schema (Dexie)
    repo.ts          all reads/writes + status derivation + dedupe
    tmdb.ts          TMDB client with demo fallback
    demoData.ts      bundled sample library
    importParser.ts  ZIP/CSV parsing + format auto-detection
    match.ts         fuzzy title matching
    importer.ts      auto-match + commit pipeline
    exporter.ts      JSON/CSV export
    stats.ts         time/episode/genre stats + badges
    hooks.ts         reactive queries (To Watch feed, library, …)
  components/        Layout, BottomNav, Poster, cards, …
  pages/             Home, Discover, ShowDetail, Profile, Import
  i18n/              en / ar translations + RTL setup
```
