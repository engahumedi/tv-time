import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tv, Clapperboard } from 'lucide-react';
import { useLibrary, useMovies } from '../lib/hooks';
import { LibraryGrid } from '../components/LibraryGrid';
import { MovieCard } from '../components/MovieCard';
import { EmptyState } from '../components/EmptyState';

/** Everything you're tracking — a searchable grid of all shows, or all movies. */
export function Library() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const kind = params.get('tab') === 'movies' ? 'movie' : 'show';
  const shows = useLibrary();
  const movies = useMovies();

  function setKind(k: 'show' | 'movie') {
    setParams(k === 'movie' ? { tab: 'movies' } : {}, { replace: true });
  }

  return (
    <div className="pt-2">
      <h1 className="mb-4 text-3xl font-bold lg:text-4xl">{t('library.title')}</h1>

      {/* Shows / Movies mode switch */}
      <div className="mb-5 flex gap-6 border-b border-overlay/[0.08]">
        {(['show', 'movie'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition-colors ${
              kind === k ? 'border-gold text-fg' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {k === 'show' ? t('discover.kind_shows') : t('discover.kind_movies')}
          </button>
        ))}
      </div>

      {kind === 'show' ? (
        shows === undefined ? null : shows.length === 0 ? (
          <EmptyState icon={<Tv size={22} strokeWidth={1.5} />} title={t('home.empty_title')} body={t('home.empty_body')} />
        ) : (
          <LibraryGrid shows={shows} />
        )
      ) : movies === undefined ? null : movies.length === 0 ? (
        <EmptyState
          icon={<Clapperboard size={22} strokeWidth={1.5} />}
          title={t('library.no_movies_title')}
          body={t('library.no_movies_body')}
        />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </div>
  );
}
