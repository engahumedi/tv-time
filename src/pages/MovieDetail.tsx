import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Heart, Check, Trash2, Plus } from 'lucide-react';
import { getMovieDetail, img } from '../lib/tmdb';
import { getImdbRating, type ImdbRating } from '../lib/omdb';
import { useMovie } from '../lib/hooks';
import {
  addMovie,
  setMovieWatched,
  toggleMovieFavorite,
  rateMovie,
  removeMovie,
} from '../lib/repo';
import { celebrate } from '../lib/celebrate';
import { formatDate } from '../lib/format';
import { Poster } from '../components/Poster';
import { TmdbRating, ImdbRating as ImdbBadge } from '../components/Rating';
import { StarRating } from '../components/StarRating';
import { ListPickerModal } from '../components/ListPickerModal';
import type { Movie } from '../types';

export function MovieDetail() {
  const { id } = useParams();
  const movieId = Number(id);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const stored = useMovie(movieId);
  const [preview, setPreview] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [imdb, setImdb] = useState<ImdbRating | null>(null);
  const [showLists, setShowLists] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMovieDetail(movieId)
      .then((m) => !cancelled && setPreview(m))
      .catch(() => {
        /* fall back to the locally stored movie, if any */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const movie = stored ?? preview;
  const inLibrary = Boolean(stored);
  const watched = stored?.watched ?? false;

  const imdbId = movie?.imdbId;
  useEffect(() => {
    setImdb(null);
    if (!imdbId) return;
    let cancelled = false;
    getImdbRating(imdbId).then((r) => !cancelled && setImdb(r));
    return () => {
      cancelled = true;
    };
  }, [imdbId]);

  if (loading && !movie) return <DetailSkeleton />;
  if (!movie) {
    return (
      <div className="flex flex-col items-center pt-16 text-center">
        <p className="mt-3 text-fg">{t('errors.load_failed')}</p>
        <button className="btn-ghost mt-4" onClick={() => navigate(-1)}>
          {t('common.close')}
        </button>
      </div>
    );
  }

  async function toggleWatched() {
    if (!movie) return;
    const next = !watched;
    await setMovieWatched(stored ?? movie, next);
    if (next) celebrate('small');
  }

  return (
    <div className="-mx-4 lg:-mx-10">
      {/* Sticky back bar */}
      <div className="pointer-events-none sticky top-0 z-20 flex items-center px-4 py-3 lg:px-10">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-navy-950/60 text-fg backdrop-blur transition-colors hover:bg-navy-900"
          aria-label={t('common.close')}
        >
          <ChevronLeft size={20} strokeWidth={2} className="rtl-flip" />
        </button>
      </div>

      {/* Backdrop hero */}
      <div className="relative -mt-16 h-56 w-full overflow-hidden lg:h-[22rem]">
        {movie.backdropPath ? (
          <img src={img(movie.backdropPath, 'w780') ?? ''} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: 'radial-gradient(120% 90% at 50% -10%, rgba(201,162,75,0.28), transparent 55%), #111015' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-4 lg:px-10">
        <div className="-mt-16 flex gap-4 lg:-mt-28 lg:gap-6">
          <div className="w-28 shrink-0 lg:w-48">
            <Poster path={movie.posterPath} alt={movie.title} className="aspect-[2/3] rounded-xl ring-1 ring-overlay/10 shadow-lift" />
          </div>
          <div className="flex-1 pt-16 lg:pt-32">
            <h1 className="text-xl font-bold leading-tight lg:text-4xl">{movie.title}</h1>
            <p className="mt-1 text-sm text-muted lg:mt-2 lg:text-base">
              {movie.releaseDate?.slice(0, 4)}
              {movie.runtime ? ` · ${t('episode.runtime', { n: movie.runtime })}` : ''}
            </p>
            {(movie.voteAverage || imdb) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <TmdbRating value={movie.voteAverage} />
                <ImdbBadge value={imdb?.rating} />
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {movie.genres.slice(0, 3).map((g) => (
                <span key={g} className="chip bg-overlay/5 text-fg">{g}</span>
              ))}
            </div>
            {inLibrary && stored?.watchedAt && (
              <p className="mt-2 text-xs text-faint">
                {t('show.last_watched', { date: formatDate(stored.watchedAt, i18n.language) })}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={toggleWatched}
            className={watched ? 'btn-ghost' : 'btn-gold'}
          >
            {watched ? <Check size={17} strokeWidth={2} /> : null}
            {watched ? t('movie.watched') : t('movie.mark_watched')}
          </button>
          {!inLibrary && (
            <button className="btn-ghost" onClick={() => addMovie({ ...movie, watched: false })}>
              <Plus size={17} strokeWidth={2} />
              {t('show.add_to_library')}
            </button>
          )}
          {inLibrary && (
            <>
              <button
                onClick={() => toggleMovieFavorite(movieId)}
                className={`grid h-11 w-11 place-items-center rounded-xl border border-overlay/10 transition-colors ${
                  stored?.favorite ? 'bg-rose-500/15 text-rose-400' : 'text-muted hover:text-rose-300'
                }`}
                aria-label={t('show.favorite')}
                title={t('show.favorite')}
                aria-pressed={Boolean(stored?.favorite)}
              >
                <Heart size={20} strokeWidth={1.8} fill={stored?.favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                className="grid h-11 w-11 place-items-center rounded-xl border border-overlay/10 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                aria-label={t('common.remove')}
                title={t('common.remove')}
                onClick={async () => {
                  if (confirm(t('movie.remove_confirm'))) {
                    await removeMovie(movieId);
                    navigate(-1);
                  }
                }}
              >
                <Trash2 size={18} strokeWidth={1.8} />
              </button>
              <button
                onClick={() => setShowLists(true)}
                className="btn-ghost text-sm"
              >
                <Plus size={16} strokeWidth={2} />
                {t('show.add_to_list')}
              </button>
            </>
          )}
        </div>

        {/* Your rating (out of 10) */}
        {inLibrary && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-overlay/[0.07] bg-navy-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{t('show.your_rating')}</p>
              <p className="text-xs text-faint">
                {stored?.userRating ? t('show.out_of_ten', { n: stored.userRating }) : t('show.rate_this')}
              </p>
            </div>
            <StarRating
              value={(stored?.userRating ?? 0) / 2}
              allowHalf
              size={26}
              onChange={(v) => rateMovie(movieId, Math.round(v * 2))}
              ariaLabel={t('show.your_rating')}
            />
          </div>
        )}

        {/* Overview */}
        {movie.overview && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{t('show.overview')}</h2>
            <p className="text-sm leading-relaxed text-fg/90">{movie.overview}</p>
          </section>
        )}
      </div>

      {showLists && (
        <ListPickerModal itemId={movieId} kind="movie" onClose={() => setShowLists(false)} />
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="-mx-4 lg:-mx-10">
      <div className="h-56 w-full shimmer lg:h-[22rem]" />
      <div className="mx-auto max-w-4xl px-4 lg:px-10">
        <div className="-mt-16 flex gap-4">
          <div className="aspect-[2/3] w-28 rounded-xl shimmer lg:w-48" />
          <div className="flex-1 space-y-3 pt-16">
            <div className="h-6 w-1/2 rounded shimmer" />
            <div className="h-4 w-1/3 rounded shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
