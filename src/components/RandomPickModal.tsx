import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Dices, Play, RefreshCw, X } from 'lucide-react';
import { discoverMovies, getMovieGenreList, hasTmdbKey } from '../lib/tmdb';
import { Poster } from './Poster';
import { TmdbRating } from './Rating';
import type { Movie } from '../types';

/**
 * "Surprise me" — a movie roulette: pick a genre (or any), get a random movie
 * to watch tonight. Re-rolling reuses the fetched pool, refetching a fresh
 * random page when it runs out.
 */
export function RandomPickModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [genreId, setGenreId] = useState<number | null>(null);
  const [pool, setPool] = useState<Movie[]>([]);
  const [pick, setPick] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (hasTmdbKey) getMovieGenreList().then(setGenres).catch(() => {});
  }, []);

  // Fetch a fresh random pool whenever the genre changes (and on first open).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const page = 1 + Math.floor(Math.random() * 5);
        const results = await discoverMovies({ genreId, sort: 'popularity.desc', page });
        if (cancelled) return;
        setPool(results);
        setPick(results.length ? results[Math.floor(Math.random() * results.length)] : null);
        if (results.length === 0) setError(true);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [genreId]);

  function reroll() {
    if (pool.length === 0) return;
    // Prefer a different pick from the current pool.
    const others = pool.filter((m) => m.id !== pick?.id);
    const from = others.length > 0 ? others : pool;
    setPick(from[Math.floor(Math.random() * from.length)]);
  }

  function go() {
    if (!pick) return;
    onClose();
    navigate(`/movie/${pick.id}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong w-full max-w-sm rounded-t-3xl p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Dices size={20} strokeWidth={1.75} className="text-gold" />
            {t('random.title')}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-fg"
            aria-label={t('common.close')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Genre chips */}
        {genres.length > 0 && (
          <div className="no-scrollbar mb-4 -mx-6 flex gap-1.5 overflow-x-auto px-6">
            <button
              onClick={() => setGenreId(null)}
              className={`chip shrink-0 ${genreId === null ? 'bg-gold/12 text-gold ring-1 ring-inset ring-gold/30' : 'text-muted hover:bg-overlay/[0.05] hover:text-fg'}`}
            >
              {t('random.any_genre')}
            </button>
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenreId(g.id)}
                className={`chip shrink-0 ${genreId === g.id ? 'bg-gold/12 text-gold ring-1 ring-inset ring-gold/30' : 'text-muted hover:bg-overlay/[0.05] hover:text-fg'}`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Pick */}
        {loading ? (
          <div className="mx-auto aspect-[2/3] w-40 rounded-xl shimmer" />
        ) : error || !pick ? (
          <p className="py-8 text-center text-sm text-muted">
            {hasTmdbKey ? t('random.none') : t('discover.demo_notice')}
          </p>
        ) : (
          <>
            <button
              onClick={go}
              className="relative mx-auto block w-40 overflow-hidden rounded-xl ring-1 ring-overlay/10 transition-transform hover:scale-[1.02]"
            >
              <div className="aspect-[2/3]">
                <Poster path={pick.posterPath} alt={pick.title} className="h-full w-full" />
              </div>
              <TmdbRating value={pick.voteAverage} className="pointer-events-none absolute end-1.5 top-1.5" />
            </button>
            <div className="mt-4 text-center">
              <p className="truncate font-display text-xl font-semibold">{pick.title}</p>
              {pick.releaseDate && <p className="text-sm text-muted">{pick.releaseDate.slice(0, 4)}</p>}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button onClick={reroll} disabled={loading || pool.length < 2} className="btn-ghost flex-1">
            <RefreshCw size={16} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
            {t('random.again')}
          </button>
          <button onClick={go} disabled={!pick} className="btn-gold flex-1">
            <Play size={16} strokeWidth={2} fill="currentColor" />
            {t('random.go')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
