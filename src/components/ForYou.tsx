import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLibrary, useMovies, useAllWatches } from '../lib/hooks';
import {
  getRecommendations,
  getMovieRecommendations,
  hasTmdbKey,
} from '../lib/tmdb';
import { ShowCard } from './ShowCard';
import { MovieCard } from './MovieCard';
import type { Show, Movie } from '../types';

interface Rail {
  seed: string;
  shows?: Show[];
  movies?: Movie[];
}

/**
 * Personalized "Because you watched X" rails, seeded from the user's own
 * library (favourites first). Live TMDB only — renders nothing in demo mode or
 * when there's nothing to base recommendations on.
 */
export function ForYou({ kind }: { kind: 'show' | 'movie' }) {
  const { t } = useTranslation();
  const library = useLibrary();
  const movies = useMovies();
  const watches = useAllWatches();
  const [rails, setRails] = useState<Rail[]>([]);

  useEffect(() => {
    if (!hasTmdbKey) return;
    let cancelled = false;
    setRails([]);

    async function build() {
      if (kind === 'show') {
        const lib = library ?? [];
        if (lib.length === 0) return;
        // Only seed from shows actually watched (≥1 episode), not ones merely
        // added to the library or a watchlist — otherwise we'd claim "because
        // you watched X" for a show the user never started.
        const watchedIds = new Set((watches ?? []).map((w) => w.showId));
        const watchedLib = lib.filter((s) => watchedIds.has(s.id));
        if (watchedLib.length === 0) return;
        const exclude = new Set(lib.map((s) => s.id));
        const seeds = pickSeeds(watchedLib, (s) => Boolean(s.favorite), (s) => s.id);
        const out: Rail[] = [];
        for (const seed of seeds) {
          try {
            const recs = (await getRecommendations(seed.id))
              .filter((s) => s.posterPath && !exclude.has(s.id))
              .slice(0, 12);
            if (recs.length) out.push({ seed: seed.name, shows: recs });
          } catch {
            /* ignore a failed seed */
          }
        }
        if (!cancelled) setRails(out);
      } else {
        const watched = (movies ?? []).filter((m) => m.watched);
        if (watched.length === 0) return;
        const exclude = new Set((movies ?? []).map((m) => m.id));
        const seeds = pickSeeds(watched, (m) => Boolean(m.favorite), (m) => m.id);
        const out: Rail[] = [];
        for (const seed of seeds) {
          try {
            const recs = (await getMovieRecommendations(seed.id))
              .filter((m) => m.posterPath && !exclude.has(m.id))
              .slice(0, 12);
            if (recs.length) out.push({ seed: seed.title, movies: recs });
          } catch {
            /* ignore a failed seed */
          }
        }
        if (!cancelled) setRails(out);
      }
    }

    build();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, library, movies, watches]);

  if (rails.length === 0) return null;

  return (
    <div className="mb-8 space-y-6">
      {rails.map((rail) => (
        <section key={rail.seed}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            {t('discover.because_you_watched', { name: rail.seed })}
          </h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {rail.shows?.map((s) => (
              <div key={s.id} className="w-28 shrink-0">
                <ShowCard show={s} subtitle={s.firstAirDate?.slice(0, 4)} />
              </div>
            ))}
            {rail.movies?.map((m) => (
              <div key={m.id} className="w-28 shrink-0">
                <MovieCard movie={m} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Pick up to two seeds: favourites first, then the most recently added, with a real (positive) TMDB id. */
function pickSeeds<T>(
  items: T[],
  isFav: (x: T) => boolean,
  idOf: (x: T) => number,
): T[] {
  const real = items.filter((x) => idOf(x) > 0);
  const favs = real.filter(isFav);
  const rest = real.filter((x) => !isFav(x));
  const seen = new Set<number>();
  const ordered = [...favs, ...rest].filter((x) => {
    const id = idOf(x);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return ordered.slice(0, 2);
}
