import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Dices, Play, RefreshCw, X } from 'lucide-react';
import { useWatchList, useWatchlistMovies } from '../lib/hooks';
import { Poster } from './Poster';

type Pick =
  | { kind: 'show'; id: number; title: string; poster: string | null; subtitle: string }
  | { kind: 'movie'; id: number; title: string; poster: string | null; subtitle: string };

/**
 * "Surprise me" — cuts through decision paralysis by picking a random thing to
 * watch from your show backlog + your movie watchlist.
 */
export function RandomPickModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const watchList = useWatchList();
  const watchlistMovies = useWatchlistMovies();

  const pool = useMemo<Pick[]>(() => {
    const shows: Pick[] = (watchList ?? []).map((i) => ({
      kind: 'show',
      id: i.show.id,
      title: i.show.name,
      poster: i.show.posterPath,
      subtitle: `S${String(i.episode.seasonNumber).padStart(2, '0')} · E${String(
        i.episode.episodeNumber,
      ).padStart(2, '0')}`,
    }));
    const movies: Pick[] = (watchlistMovies ?? []).map((m) => ({
      kind: 'movie',
      id: m.id,
      title: m.title,
      poster: m.posterPath,
      subtitle: m.releaseDate?.slice(0, 4) ?? '',
    }));
    return [...shows, ...movies];
  }, [watchList, watchlistMovies]);

  const [pick, setPick] = useState<Pick | null>(null);
  const [spinning, setSpinning] = useState(false);

  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Seed the first pick once the pool is ready.
  const ready = watchList !== undefined && watchlistMovies !== undefined;
  if (ready && pick === null && pool.length > 0) {
    setPick(pool[Math.floor(Math.random() * pool.length)]);
  }

  function roll() {
    if (pool.length === 0) return;
    setSpinning(true);
    // A short shuffle for a touch of anticipation.
    let ticks = 0;
    const timer = setInterval(() => {
      setPick(pool[Math.floor(Math.random() * pool.length)]);
      if (++ticks >= 6) {
        clearInterval(timer);
        setSpinning(false);
      }
    }, 70);
  }

  function go() {
    if (!pick) return;
    onClose();
    navigate(pick.kind === 'show' ? `/show/${pick.id}` : `/movie/${pick.id}`);
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

        {ready && pool.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{t('random.empty')}</p>
        ) : pick ? (
          <>
            <button
              onClick={go}
              className="mx-auto block w-40 overflow-hidden rounded-xl ring-1 ring-overlay/10 transition-transform hover:scale-[1.02]"
            >
              <div className={`aspect-[2/3] ${spinning ? 'opacity-70' : ''}`}>
                <Poster path={pick.poster} alt={pick.title} className="h-full w-full" />
              </div>
            </button>
            <div className="mt-4 text-center">
              <span className="chip bg-gold/12 text-gold">
                {pick.kind === 'show' ? t('discover.kind_shows') : t('discover.kind_movies')}
              </span>
              <p className="mt-2 truncate font-display text-xl font-semibold">{pick.title}</p>
              {pick.subtitle && <p className="text-sm text-muted">{pick.subtitle}</p>}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={roll} disabled={spinning || pool.length < 2} className="btn-ghost flex-1">
                <RefreshCw size={16} strokeWidth={2} className={spinning ? 'animate-spin' : ''} />
                {t('random.again')}
              </button>
              <button onClick={go} className="btn-gold flex-1">
                <Play size={16} strokeWidth={2} fill="currentColor" />
                {t('random.go')}
              </button>
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-sm text-faint">{t('common.loading')}</div>
        )}
      </motion.div>
    </div>
  );
}
