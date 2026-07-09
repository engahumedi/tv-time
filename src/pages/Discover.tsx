import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Film, WifiOff, SearchX } from 'lucide-react';
import {
  searchShows,
  searchPeople,
  getTrending,
  getTopRated,
  discoverByGenre,
  getGenreList,
  searchMovies,
  getTrendingMovies,
  getTopRatedMovies,
  hasTmdbKey,
  type Person,
} from '../lib/tmdb';
import { ShowCard } from '../components/ShowCard';
import { MovieCard } from '../components/MovieCard';
import { ForYou } from '../components/ForYou';
import { PersonCard } from '../components/PersonCard';
import { PersonModal } from '../components/PersonModal';
import { EmptyState } from '../components/EmptyState';
import type { Show, Movie } from '../types';

type Kind = 'show' | 'movie';
type Tab = 'search' | 'trending' | 'top' | 'genres';

export function Discover() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<Kind>('show');
  const [tab, setTab] = useState<Tab>('trending');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Show[] | null>(null);
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [genreId, setGenreId] = useState<number | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Demo mode has no browse endpoints — default to search.
  useEffect(() => {
    if (!hasTmdbKey) setTab('search');
  }, []);

  // Load genre list once.
  useEffect(() => {
    if (hasTmdbKey) getGenreList().then(setGenres).catch(() => {});
  }, []);

  // Movies have no genres tab — fall back to trending when switching over.
  function switchKind(k: Kind) {
    setKind(k);
    setResults(null);
    setMovies(null);
    setPeople([]);
    if (k === 'movie' && tab === 'genres') setTab('trending');
  }

  // Search (debounced).
  useEffect(() => {
    if (tab !== 'search') return;
    clearTimeout(debounce.current);
    const q = query.trim();
    if (!q) {
      setPeople([]);
      if (kind === 'movie') {
        setMovies(hasTmdbKey ? null : []);
      } else {
        setResults(hasTmdbKey ? null : []);
        if (!hasTmdbKey) searchShows('').then(setResults);
      }
      return;
    }
    setLoading(true);
    setError(false);
    debounce.current = setTimeout(async () => {
      try {
        if (kind === 'movie') {
          setMovies(await searchMovies(q));
        } else {
          const [shows, ppl] = await Promise.all([
            searchShows(q),
            hasTmdbKey ? searchPeople(q) : Promise.resolve([]),
          ]);
          setResults(shows);
          setPeople(ppl.filter((p) => p.profilePath).slice(0, 8));
        }
      } catch {
        setError(true);
        if (kind === 'movie') setMovies([]);
        else setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [query, tab, kind]);

  // Browse tabs.
  useEffect(() => {
    if (tab === 'search') return;
    setLoading(true);
    setError(false);
    setResults(null);
    setMovies(null);
    const load =
      kind === 'movie'
        ? tab === 'trending'
          ? getTrendingMovies()
          : tab === 'top'
            ? getTopRatedMovies()
            : Promise.resolve([] as Movie[])
        : tab === 'trending'
          ? getTrending()
          : tab === 'top'
            ? getTopRated()
            : genreId
              ? discoverByGenre(genreId)
              : Promise.resolve([] as Show[]);
    (load as Promise<Show[] | Movie[]>)
      .then((r) => (kind === 'movie' ? setMovies(r as Movie[]) : setResults(r as Show[])))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tab, genreId, kind]);

  const allTabs: { key: Tab; label: string }[] = [
    { key: 'trending', label: t('discover.tab_trending') },
    { key: 'top', label: t('discover.tab_top') },
    { key: 'genres', label: t('discover.tab_genres') },
    { key: 'search', label: t('discover.tab_search') },
  ];
  const tabs = kind === 'movie' ? allTabs.filter((tb) => tb.key !== 'genres') : allTabs;

  const hasResults = kind === 'movie' ? movies : results;

  return (
    <div className="pt-2">
      <h1 className="mb-4 text-3xl font-bold lg:text-4xl">
        {t('discover.title')}
      </h1>

      {/* Shows / Movies mode switch */}
      <div className="mb-5 flex gap-6 border-b border-overlay/[0.08]">
        {(['show', 'movie'] as const).map((k) => (
          <button
            key={k}
            onClick={() => switchKind(k)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition-colors ${
              kind === k
                ? 'border-gold text-fg'
                : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {k === 'show' ? t('discover.kind_shows') : t('discover.kind_movies')}
          </button>
        ))}
      </div>

      {hasTmdbKey && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                tab === tb.key
                  ? 'bg-gold/12 text-gold ring-1 ring-inset ring-gold/30'
                  : 'text-muted hover:bg-overlay/[0.05] hover:text-fg'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'search' && (
        <div className="relative mx-auto mb-5 max-w-2xl lg:mx-0">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-faint">
            <Search size={19} strokeWidth={1.75} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={kind === 'movie' ? t('discover.placeholder_movie') : t('discover.placeholder')}
            className="w-full rounded-2xl border border-overlay/[0.08] bg-navy-800 py-3 ps-11 pe-4 text-base outline-none transition-colors placeholder:text-faint focus:border-gold/60"
            autoFocus
          />
        </div>
      )}

      {kind === 'show' && tab === 'genres' && (
        <div className="no-scrollbar -mx-4 mb-4 flex flex-wrap gap-2 px-4 lg:mx-0 lg:px-0">
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => setGenreId(g.id)}
              className={`chip ${
                genreId === g.id
                  ? 'bg-gold/12 text-gold ring-1 ring-inset ring-gold/30'
                  : 'text-muted hover:bg-overlay/[0.05] hover:text-fg'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {!hasTmdbKey && (
        <p className="mb-4 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 py-2 text-xs text-gold">
          {t('discover.demo_notice')}
        </p>
      )}

      {/* Personalized rails, seeded from your library (live data only). */}
      {tab === 'trending' && <ForYou kind={kind} />}

      {loading && <GridSkeleton />}

      {!loading && error && (
        <EmptyState icon={<WifiOff size={22} strokeWidth={1.5} />} title={t('errors.search_failed')} body="" />
      )}

      {/* People results (shows search only) */}
      {!loading && kind === 'show' && tab === 'search' && people.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            {t('discover.people')}
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {people.map((p) => (
              <PersonCard key={p.id} person={p} onClick={() => setPerson(p)} />
            ))}
          </div>
        </section>
      )}

      {!loading && !error && hasResults && hasResults.length === 0 && (
        <EmptyState
          icon={tab === 'search' && query ? <SearchX size={22} strokeWidth={1.5} /> : <Film size={22} strokeWidth={1.5} />}
          title={
            tab === 'search' && query
              ? t('discover.no_results', { query })
              : t('discover.empty_title')
          }
          body={tab === 'search' ? '' : t('discover.empty_body')}
        />
      )}

      {!loading && kind === 'show' && results && results.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {results.map((s) => (
            <ShowCard key={s.id} show={s} subtitle={s.firstAirDate?.slice(0, 4)} />
          ))}
        </div>
      )}

      {!loading && kind === 'movie' && movies && movies.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}

      {person && (
        <PersonModal person={person} onClose={() => setPerson(null)} />
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] rounded-xl shimmer" />
      ))}
    </div>
  );
}
