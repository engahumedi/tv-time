import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Film, Check, RotateCw, Minus, Share2 } from 'lucide-react';
import { img } from '../lib/tmdb';
import { useWatch } from '../lib/hooks';
import { useEffect, useRef, useState } from 'react';
import { markWatched, unmarkWatched, rateEpisode, setEpisodeNote, rewatchEpisode, removeRewatch } from '../lib/repo';
import { celebrate } from '../lib/celebrate';
import { formatDate } from '../lib/format';
import { StarRating } from './StarRating';
import { EpisodeShareModal } from './EpisodeShareModal';
import { EpisodeReactions } from './EpisodeReactions';
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
  const plays = watch?.plays && watch.plays > 1 ? watch.plays : 1;
  const still = img(episode.stillPath, 'w500');
  const [sharing, setSharing] = useState(false);

  // Local note state with debounced save.
  const [note, setNote] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>();
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    // Seed the textarea once per episode from the stored note.
    if (watch !== undefined && loadedFor.current !== episode.id) {
      setNote(watch?.note ?? '');
      loadedFor.current = episode.id;
    }
  }, [watch, episode.id]);

  function onNoteChange(v: string) {
    setNote(v);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(async () => {
      await setEpisodeNote(episode, v, show.episodeRuntime);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }, 700);
  }

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
            <img src={still} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-faint">
              <Film size={36} strokeWidth={1.25} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 to-transparent" />
          <button
            onClick={onClose}
            className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-navy-950/70 text-fg backdrop-blur"
            aria-label={t('common.close')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gold">
              S{episode.seasonNumber} · E{episode.episodeNumber}
            </p>
            <h2 className="text-lg font-bold leading-tight">{episode.name}</h2>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
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
            <p className="text-sm leading-relaxed text-fg">{episode.overview}</p>
          )}

          {inLibrary && (
            <>
              {/* Rating */}
              <div className="flex items-center justify-between rounded-xl bg-overlay/[0.04] px-4 py-3">
                <span className="text-sm font-semibold text-fg">
                  {t('episode.rate')}
                </span>
                <StarRating
                  value={watch?.rating ?? 0}
                  onChange={(r) => rateEpisode(episode, r, show.episodeRuntime)}
                  ariaLabel={t('episode.rate')}
                />
              </div>

              {/* Personal note */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted">
                    {t('episode.note')}
                  </span>
                  {savedFlash && (
                    <span className="text-xs text-emerald-300">
                      {t('episode.note_saved')}
                    </span>
                  )}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => onNoteChange(e.target.value)}
                  placeholder={t('episode.note_placeholder')}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-overlay/[0.08] bg-navy-700 px-3 py-2 text-sm outline-none focus:border-gold/50"
                />
              </div>

              {/* Watched toggle */}
              <button
                onClick={toggleWatched}
                className={isWatched ? 'btn-ghost w-full' : 'btn-gold w-full'}
              >
                {isWatched && <Check size={17} strokeWidth={2} />}
                {isWatched ? t('episode.watched') : t('episode.mark_watched')}
              </button>

              {/* Re-watches */}
              {isWatched && (
                <div className="flex items-center justify-between rounded-xl bg-overlay/[0.04] px-4 py-3">
                  <span className="text-sm font-semibold text-fg">
                    {t('episode.times_watched')}
                    <span className="ms-2 font-display text-base font-bold text-gold">×{plays}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {plays > 1 && (
                      <button
                        onClick={() => removeRewatch(episode.id, episode.showId)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-overlay/[0.12] text-muted hover:text-fg"
                        aria-label={t('episode.remove_rewatch')}
                      >
                        <Minus size={16} strokeWidth={2} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        rewatchEpisode(episode, show.episodeRuntime);
                        celebrate('small');
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gold/12 px-3 text-sm font-semibold text-gold ring-1 ring-inset ring-gold/25 hover:bg-gold/20"
                    >
                      <RotateCw size={14} strokeWidth={2} /> {t('episode.watch_again')}
                    </button>
                  </div>
                </div>
              )}

              {/* Share a card for this episode */}
              {isWatched && (
                <button onClick={() => setSharing(true)} className="btn-ghost w-full">
                  <Share2 size={16} strokeWidth={1.9} /> {t('episode.share_cta')}
                </button>
              )}
            </>
          )}

          {/* Reactions (shared socially) */}
          <EpisodeReactions episodeId={episode.id} showId={show.id} />
        </div>
      </motion.div>

      {sharing && (
        <EpisodeShareModal episode={episode} show={show} watch={watch} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}
