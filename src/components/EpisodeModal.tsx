import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { img } from '../lib/tmdb';
import { useWatch } from '../lib/hooks';
import { markWatched, unmarkWatched, rateEpisode } from '../lib/repo';
import { celebrate } from '../lib/celebrate';
import { formatDate } from '../lib/format';
import { StarRating } from './StarRating';
import type { Episode, Show } from '../types';

/** Bottom-sheet with full episode details, watched date, and a 5-star rating. */
export function EpisodeModal({
  episode,
  show,
  inLibrary,
  lang,
  onClose,
}: {
  episode: Episode;
  show: Show;
  inLibrary: boolean;
  lang: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const watch = useWatch(episode.id);
  const isWatched = Boolean(watch);
  const still = img(episode.stillPath, 'w500');

  async function toggleWatched() {
    if (isWatched) await unmarkWatched(episode.id, episode.showId);
    else {
      await markWatched(episode, Date.now(), 'manual', show.episodeRuntime);
      celebrate('small');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Still image */}
        <div className="relative aspect-video w-full overflow-hidden rounded-t-3xl bg-navy-700">
          {still ? (
            <img src={still} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-zinc-600">
              🎬
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 to-transparent" />
          <button
            onClick={onClose}
            className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-navy-950/70 text-zinc-200 backdrop-blur"
            aria-label={t('common.close')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gold-400">
              S{episode.seasonNumber} · E{episode.episodeNumber}
            </p>
            <h2 className="text-lg font-extrabold leading-tight">{episode.name}</h2>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
            {episode.airDate && <span>{formatDate(episode.airDate, lang)}</span>}
            {episode.runtime ? (
              <span>· {t('episode.runtime', { n: episode.runtime })}</span>
            ) : null}
            <span className={isWatched ? 'text-emerald-300' : ''}>
              ·{' '}
              {isWatched && watch
                ? t('episode.watched_on', { date: formatDate(watch.watchedAt, lang) })
                : t('episode.not_watched')}
            </span>
          </div>

          {episode.overview && (
            <p className="text-sm leading-relaxed text-zinc-300">{episode.overview}</p>
          )}

          {inLibrary && (
            <>
              {/* Rating */}
              <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
                <span className="text-sm font-semibold text-zinc-300">
                  {t('episode.rate')}
                </span>
                <StarRating
                  value={watch?.rating ?? 0}
                  onChange={(r) => rateEpisode(episode, r, show.episodeRuntime)}
                  ariaLabel={t('episode.rate')}
                />
              </div>

              {/* Watched toggle */}
              <button
                onClick={toggleWatched}
                className={isWatched ? 'btn-ghost w-full' : 'btn-gold w-full'}
              >
                {isWatched ? `✓ ${t('episode.watched')}` : t('episode.mark_watched')}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
