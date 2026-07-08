import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { getShowDetail, getAllEpisodes, img } from '../lib/tmdb';
import {
  useShow,
  useEpisodes,
  useWatchedIds,
  useIsInLibrary,
} from '../lib/hooks';
import {
  upsertShow,
  saveEpisodes,
  markWatched,
  unmarkWatched,
  markSeasonWatched,
  markShowWatched,
  removeShow,
  setStatus,
  rateShow,
} from '../lib/repo';
import { celebrate } from '../lib/celebrate';
import { getImdbRating, type ImdbRating } from '../lib/omdb';
import { formatDate } from '../lib/format';
import { Poster } from '../components/Poster';
import { StatusBadge } from '../components/StatusBadge';
import { TmdbRating, ImdbRating as ImdbBadge } from '../components/Rating';
import { StarRating } from '../components/StarRating';
import { EpisodeModal } from '../components/EpisodeModal';
import type { Show, Episode, ShowStatus } from '../types';

const STATUSES: ShowStatus[] = [
  'not_started',
  'watching',
  'up_to_date',
  'finished',
  'stopped',
];

export function ShowDetail() {
  const { id } = useParams();
  const showId = Number(id);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const inLibrary = useIsInLibrary(showId);
  const storedShow = useShow(showId);
  const storedEpisodes = useEpisodes(showId);

  // When not in the library, fetch a live preview from TMDB/demo.
  const [previewShow, setPreviewShow] = useState<Show | null>(null);
  const [previewEpisodes, setPreviewEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [imdb, setImdb] = useState<ImdbRating | null>(null);
  const [selectedEp, setSelectedEp] = useState<Episode | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const detail = await getShowDetail(showId);
        const eps = await getAllEpisodes(showId, detail.episodeRuntime);
        if (!cancelled) {
          setPreviewShow(detail);
          setPreviewEpisodes(eps);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showId]);

  const show = inLibrary ? storedShow : previewShow;
  const episodes = inLibrary ? storedEpisodes ?? [] : previewEpisodes;
  const watchedIds = useWatchedIds(showId);

  const seasons = useMemo(() => groupSeasons(episodes), [episodes]);

  // Fetch the IMDb rating (via OMDb) once we know the show's IMDb id.
  const imdbId = show?.imdbId;
  useEffect(() => {
    setImdb(null);
    if (!imdbId) return;
    let cancelled = false;
    getImdbRating(imdbId).then((r) => {
      if (!cancelled) setImdb(r);
    });
    return () => {
      cancelled = true;
    };
  }, [imdbId]);

  if (loading && !show) return <DetailSkeleton />;
  if (error || !show) {
    return (
      <div className="pt-16 text-center">
        <p className="text-4xl">😕</p>
        <p className="mt-3 text-slate-300">{t('errors.load_failed')}</p>
        <button className="btn-ghost mt-4" onClick={() => navigate(-1)}>
          {t('common.close')}
        </button>
      </div>
    );
  }

  const watchedCount = watchedIds ? watchedIds.size : 0;
  const totalCount = episodes.length;

  async function handleAdd() {
    if (!show) return;
    setAdding(true);
    await upsertShow(show);
    await saveEpisodes(previewEpisodes.length ? previewEpisodes : episodes);
    setAdding(false);
  }

  async function toggleEpisode(ep: Episode) {
    if (!watchedIds) return;
    if (watchedIds.has(ep.id)) {
      await unmarkWatched(ep.id, showId);
    } else {
      await markWatched(ep, Date.now(), 'manual', show!.episodeRuntime);
      // Celebrate when this completes a season.
      const seasonEps = episodes.filter(
        (e) => e.seasonNumber === ep.seasonNumber,
      );
      const seasonWatched =
        seasonEps.filter((e) => watchedIds.has(e.id) || e.id === ep.id).length;
      if (seasonWatched === seasonEps.length) celebrate('big');
      else celebrate('small');
    }
  }

  return (
    <div className="-mx-4 lg:-mx-10">
      {/* Sticky back bar */}
      <div className="pointer-events-none sticky top-0 z-20 flex items-center px-4 py-3 lg:px-10">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-navy-950/60 text-zinc-100 backdrop-blur transition-colors hover:bg-navy-900"
          aria-label={t('common.close')}
        >
          <svg className="rtl-flip" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Backdrop hero */}
      <div className="relative -mt-16 h-56 w-full overflow-hidden lg:h-[22rem]">
        {show.backdropPath ? (
          <img
            src={img(show.backdropPath, 'w780') ?? ''}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          // Graceful fallback when a show has no backdrop image.
          <div
            className="h-full w-full"
            style={{
              background:
                'radial-gradient(120% 90% at 50% -10%, rgba(255,91,69,0.28), transparent 55%), #111015',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-4 lg:px-10">
        <div className="-mt-16 flex gap-4 lg:-mt-28 lg:gap-6">
          <div className="w-28 shrink-0 lg:w-48">
            <Poster
              path={show.posterPath}
              alt={show.name}
              className="aspect-[2/3] rounded-xl ring-1 ring-white/10 shadow-lift"
            />
          </div>
          <div className="flex-1 pt-16 lg:pt-32">
            <h1 className="text-xl font-extrabold leading-tight lg:text-4xl">{show.name}</h1>
            <p className="mt-1 text-sm text-zinc-400 lg:mt-2 lg:text-base">
              {show.firstAirDate?.slice(0, 4)}
              {show.numberOfSeasons
                ? ` · ${show.numberOfSeasons} ${t('common.seasons')}`
                : ''}
            </p>
            {(show.voteAverage || imdb) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TmdbRating value={show.voteAverage} />
                <ImdbBadge value={imdb?.rating} />
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {show.genres.slice(0, 3).map((g) => (
                <span key={g} className="chip bg-white/5 text-zinc-300">
                  {g}
                </span>
              ))}
            </div>
            {inLibrary && storedShow && (
              <p className="mt-2 text-xs text-zinc-500">
                {t('show.added_on', {
                  date: formatDate(storedShow.addedAt, i18n.language),
                })}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {inLibrary ? (
            <>
              <StatusSelect
                value={storedShow?.status ?? 'watching'}
                onChange={(s) => setStatus(showId, s)}
              />
              <button
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                aria-label={t('common.remove')}
                title={t('common.remove')}
                onClick={async () => {
                  if (confirm(t('show.remove_confirm'))) {
                    await removeShow(showId);
                    navigate(-1);
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
                </svg>
              </button>
            </>
          ) : (
            <button className="btn-gold" disabled={adding} onClick={handleAdd}>
              {adding ? t('common.loading') : t('show.add_to_library')}
            </button>
          )}
        </div>

        {/* Your rating (out of 10) */}
        {inLibrary && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-navy-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{t('show.your_rating')}</p>
              <p className="text-xs text-zinc-500">
                {storedShow?.userRating
                  ? t('show.out_of_ten', { n: storedShow.userRating })
                  : t('show.rate_this')}
              </p>
            </div>
            <StarRating
              value={(storedShow?.userRating ?? 0) / 2}
              allowHalf
              size={26}
              onChange={(v) => rateShow(showId, Math.round(v * 2))}
              ariaLabel={t('show.your_rating')}
            />
          </div>
        )}

        {inLibrary && totalCount > 0 && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>
                {t('show.progress', { watched: watchedCount, total: totalCount })}
              </span>
              <StatusBadge status={storedShow?.status ?? 'watching'} />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gold"
                initial={{ width: 0 }}
                animate={{
                  width: `${totalCount ? (watchedCount / totalCount) * 100 : 0}%`,
                }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        )}

        {/* Overview */}
        {show.overview && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
              {t('show.overview')}
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              {show.overview}
            </p>
          </section>
        )}

        {inLibrary && totalCount > 0 && (
          <button
            className="btn-ghost mt-4 w-full text-sm"
            onClick={() => markShowWatched(showId, show.episodeRuntime)}
          >
            {t('show.mark_show_watched')}
          </button>
        )}

        {/* Seasons */}
        <section className="mt-6 pb-4">
          <h2 className="mb-3 text-lg font-bold">{t('show.seasons_title')}</h2>
          {seasons.length === 0 ? (
            <p className="text-sm text-slate-500">{t('show.no_episodes')}</p>
          ) : (
            <div className="space-y-3">
              {seasons.map((season) => (
                <SeasonBlock
                  key={season.number}
                  showId={showId}
                  seasonNumber={season.number}
                  episodes={season.episodes}
                  watchedIds={watchedIds}
                  inLibrary={inLibrary}
                  defaultRuntime={show.episodeRuntime}
                  onToggle={toggleEpisode}
                  onOpen={setSelectedEp}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedEp && (
        <EpisodeModal
          episode={selectedEp}
          show={show}
          inLibrary={inLibrary}
          lang={i18n.language}
          onClose={() => setSelectedEp(null)}
        />
      )}
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: ShowStatus;
  onChange: (s: ShowStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ShowStatus)}
      className="rounded-xl border border-white/10 bg-navy-800 px-3 py-2.5 text-sm font-semibold outline-none focus:border-gold/50"
      aria-label={t('show.set_status')}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(`status.${s}`)}
        </option>
      ))}
    </select>
  );
}

interface SeasonGroup {
  number: number;
  episodes: Episode[];
}

function groupSeasons(episodes: Episode[]): SeasonGroup[] {
  const map = new Map<number, Episode[]>();
  for (const e of episodes) {
    if (!map.has(e.seasonNumber)) map.set(e.seasonNumber, []);
    map.get(e.seasonNumber)!.push(e);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, eps]) => ({
      number,
      episodes: eps.sort((a, b) => a.episodeNumber - b.episodeNumber),
    }));
}

function SeasonBlock({
  showId,
  seasonNumber,
  episodes,
  watchedIds,
  inLibrary,
  defaultRuntime,
  onToggle,
  onOpen,
}: {
  showId: number;
  seasonNumber: number;
  episodes: Episode[];
  watchedIds: Set<string> | undefined;
  inLibrary: boolean;
  defaultRuntime: number;
  onToggle: (ep: Episode) => void;
  onOpen: (ep: Episode) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(seasonNumber === 1);
  const watched = watchedIds
    ? episodes.filter((e) => watchedIds.has(e.id)).length
    : 0;
  const allWatched = watched === episodes.length && episodes.length > 0;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <div>
          <p className="font-bold">
            {t('common.season')} {seasonNumber}
          </p>
          <p className="text-xs text-slate-400">
            {watched} / {episodes.length} {t('common.episodes')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inLibrary && !allWatched && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                markSeasonWatched(showId, seasonNumber, defaultRuntime).then(() =>
                  celebrate('big'),
                );
              }}
              className="chip cursor-pointer bg-gold/15 text-gold-400 hover:bg-gold/25"
            >
              {t('show.mark_season_watched')}
            </span>
          )}
          <svg
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            {episodes.map((ep) => {
              const isWatched = watchedIds?.has(ep.id) ?? false;
              return (
                <li
                  key={ep.id}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-white/[0.03]"
                >
                  <button
                    onClick={() => onOpen(ep)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-start"
                  >
                    <span className="w-6 shrink-0 text-center text-xs text-zinc-500">
                      {ep.episodeNumber}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{ep.name}</span>
                    <svg className="rtl-flip shrink-0 text-zinc-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                  <button
                    disabled={!inLibrary}
                    onClick={() => onToggle(ep)}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all active:scale-90 ${
                      isWatched
                        ? 'border-gold bg-gold text-navy-950'
                        : 'border-white/20 text-transparent hover:border-gold/60'
                    } ${!inLibrary ? 'opacity-40' : ''}`}
                    aria-label={t('show.mark_watched')}
                    aria-pressed={isWatched}
                  >
                    <motion.svg
                      key={isWatched ? 'on' : 'off'}
                      initial={isWatched ? { scale: 0.4 } : false}
                      animate={{ scale: 1 }}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </motion.svg>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="-mx-4">
      <div className="h-56 w-full shimmer" />
      <div className="px-4">
        <div className="-mt-16 flex gap-4">
          <div className="aspect-[2/3] w-28 rounded-xl shimmer" />
          <div className="flex-1 space-y-2 pt-16">
            <div className="h-5 w-2/3 rounded shimmer" />
            <div className="h-3 w-1/3 rounded shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
