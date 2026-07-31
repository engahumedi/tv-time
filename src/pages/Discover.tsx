import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Film, WifiOff, SearchX, SlidersHorizontal, X } from 'lucide-react';
import {
  searchShows,
  searchPeople,
  getTrending,
  getTopRated,
  getGenreList,
  getMovieGenreList,
  discoverShows,
  discoverMovies,
  searchMovies,
  getTrendingMovies,
  getTopRatedMovies,
  hasTmdbKey,
  type Person,
  type DiscoverFilters,
} from '../lib/tmdb';
import { ShowCard } from '../components/ShowCard';
import { MovieCard } from '../components/MovieCard';
import { ForYou } from '../components/ForYou';
import { FriendsPopular } from '../components/FriendsPopular';
import { PersonCard } from '../components/PersonCard';
import { PersonModal } from '../components/PersonModal';
import { EmptyState } from '../components/EmptyState';
import type { Show, Movie } from '../types';

type Kind = 'show' | 'movie';
type Tab = 'trending' | 'top' | 'filters';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1969 }, (_, i) => CURRENT_YEAR - i);
const RATINGS = [9, 8, 7, 6, 5];
/** TMDB pages pulled per load — 20 results each, so the grid opens deep. */
const PAGES_PER_LOAD = 3;

/** Merge pages, dropping repeats (TMDB pages can overlap). */
function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}

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
  // Paging for the browse grids ("Load more").
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [tvGenres, setTvGenres] = useState<{ id: number; name: string }[]>([]);
  const [movieGenres, setMovieGenres] = useState<{ id: number; name: string }[]>([]);
  // Filters
  const [genreId, setGenreId] = useState<number | null>(null);
  const [year, setYear] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('popularity.desc');
  const [person, setPerson] = useState<Person | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const searching = query.trim().length > 0;

  // Load both genre lists once.
  useEffect(() => {
    if (!hasTmdbKey) return;
    getGenreList().then(setTvGenres).catch(() => {});
    getMovieGenreList().then(setMovieGenres).catch(() => {});
  }, []);

  function switchKind(k: Kind) {
    setKind(k);
    setResults(null);
    setMovies(null);
    setPeople([]);
    setGenreId(null); // genre ids differ between tv and movie
  }

  function clearFilters() {
    setGenreId(null);
    setYear('');
    setMinRating(0);
    setSort('popularity.desc');
  }

  const filtersActive = genreId !== null || year !== '' || minRating !== 0 || sort !== 'popularity.desc';

  // Search (debounced) — active whenever there's a query.
  useEffect(() => {
    if (!searching) return;
    clearTimeout(debounce.current);
    setLoading(true);
    setError(false);
    const q = query.trim();
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
  }, [query, kind, searching]);

  /** Fetch one TMDB page of whatever browse selection is active. */
  function fetchBrowsePage(p: number): Promise<Show[] | Movie[]> {
    const filters: DiscoverFilters = { genreId, year, minRating, sort, page: p };
    return kind === 'movie'
      ? tab === 'trending'
        ? getTrendingMovies(p)
        : tab === 'top'
          ? getTopRatedMovies(p)
          : discoverMovies(filters)
      : tab === 'trending'
        ? getTrending(p)
        : tab === 'top'
          ? getTopRated(p)
          : discoverShows(filters);
  }

  // Browse (trending / top / filters) — active when not searching.
  useEffect(() => {
    if (searching) return;
    setLoading(true);
    setError(false);
    setResults(null);
    setMovies(null);
    setPeople([]);
    setPagesLoaded(0);
    setExhausted(false);
    // Demo mode has no browse endpoints — fall back to the sample library.
    if (!hasTmdbKey) {
      searchShows('').then(setResults).catch(() => setError(true)).finally(() => setLoading(false));
      setMovies([]);
      return;
    }
    let cancelled = false;
    // Load several pages up front so Discover opens with a deep grid, not 20 items.
    Promise.all(Array.from({ length: PAGES_PER_LOAD }, (_, i) => fetchBrowsePage(i + 1)))
      .then((pages) => {
        if (cancelled) return;
        const merged = dedupeById(pages.flat() as (Show | Movie)[]);
        if (kind === 'movie') setMovies(merged as Movie[]);
        else setResults(merged as Show[]);
        setPagesLoaded(PAGES_PER_LOAD);
        if (pages[pages.length - 1].length === 0) setExhausted(true);
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, tab, kind, genreId, year, minRating, sort]);

  /** Append the next batch of pages to the grid. */
  async function loadMore() {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    try {
      const next = Array.from({ length: PAGES_PER_LOAD }, (_, i) => pagesLoaded + i + 1);
      const pages = await Promise.all(next.map((p) => fetchBrowsePage(p)));
      const incoming = pages.flat() as (Show | Movie)[];
      if (incoming.length === 0) {
        setExhausted(true);
      } else {
        if (kind === 'movie') setMovies((cur) => dedupeById([...(cur ?? []), ...incoming]) as Movie[]);
        else setResults((cur) => dedupeById([...(cur ?? []), ...incoming]) as Show[]);
        setPagesLoaded((n) => n + PAGES_PER_LOAD);
        // TMDB caps browse paging at 500 pages; stop when a page comes back short.
        if (pages[pages.length - 1].length === 0) setExhausted(true);
      }
    } catch {
      setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'trending', label: t('discover.tab_trending') },
    { key: 'top', label: t('discover.tab_top') },
    { key: 'filters', label: t('discover.tab_filters') },
  ];

  const genres = kind === 'movie' ? movieGenres : tvGenres;
  const hasResults = kind === 'movie' ? movies : results;
  const showFilters = tab === 'filters' && !searching && hasTmdbKey;

  return (
    <div className="pt-2">
      <h1 className="mb-4 text-3xl font-bold lg:text-4xl">{t('discover.title')}</h1>

      {/* Shows / Movies mode switch */}
      <div className="mb-5 flex gap-6 border-b border-overlay/[0.08]">
        {(['show', 'movie'] as const).map((k) => (
          <button
            key={k}
            onClick={() => switchKind(k)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition-colors ${
              kind === k ? 'border-gold text-fg' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {k === 'show' ? t('discover.kind_shows') : t('discover.kind_movies')}
          </button>
        ))}
      </div>

      {/* Persistent search bar */}
      <div className="relative mb-5">
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-faint">
          <Search size={19} strokeWidth={1.75} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={kind === 'movie' ? t('discover.placeholder_movie') : t('discover.placeholder')}
          className="w-full rounded-2xl border border-overlay/[0.08] bg-navy-800 py-3 ps-11 pe-11 text-base outline-none transition-colors placeholder:text-faint focus:border-gold/60"
        />
        {searching && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 end-2 my-auto grid h-8 w-8 place-items-center rounded-full text-faint hover:text-fg"
            aria-label={t('filters.clear')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Browse tabs (hidden while searching or in demo) */}
      {hasTmdbKey && !searching && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                tab === tb.key
                  ? 'bg-gold/12 text-gold ring-1 ring-inset ring-gold/30'
                  : 'text-muted hover:bg-overlay/[0.05] hover:text-fg'
              }`}
            >
              {tb.key === 'filters' && <SlidersHorizontal size={14} strokeWidth={2} />}
              {tb.label}
              {tb.key === 'filters' && filtersActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              )}
            </button>
          ))}
        </div>
      )}

      {showFilters && (
        <div className="mb-5 space-y-3">
          {/* Genre chips */}
          <div className="no-scrollbar -mx-4 flex flex-wrap gap-2 px-4 lg:mx-0 lg:px-0">
            <button
              onClick={() => setGenreId(null)}
              className={`chip ${genreId === null ? 'bg-gold/12 text-gold ring-1 ring-inset ring-gold/30' : 'text-muted hover:bg-overlay/[0.05] hover:text-fg'}`}
            >
              {t('filters.all_genres')}
            </button>
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenreId(g.id)}
                className={`chip ${genreId === g.id ? 'bg-gold/12 text-gold ring-1 ring-inset ring-gold/30' : 'text-muted hover:bg-overlay/[0.05] hover:text-fg'}`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Year / rating / sort selects */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={year} onChange={setYear} ariaLabel={t('filters.year')}>
              <option value="">{t('filters.year_any')}</option>
              {YEARS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </FilterSelect>

            <FilterSelect value={String(minRating)} onChange={(v) => setMinRating(Number(v))} ariaLabel={t('filters.min_rating')}>
              <option value="0">{t('filters.rating_any')}</option>
              {RATINGS.map((r) => (
                <option key={r} value={String(r)}>{t('filters.rating_plus', { n: r })}</option>
              ))}
            </FilterSelect>

            <FilterSelect value={sort} onChange={setSort} ariaLabel={t('filters.sort')}>
              <option value="popularity.desc">{t('filters.sort_popularity')}</option>
              <option value="vote_average.desc">{t('filters.sort_rating')}</option>
              <option value="date.desc">{t('filters.sort_newest')}</option>
            </FilterSelect>

            {filtersActive && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-overlay/[0.05] hover:text-fg"
              >
                <X size={15} strokeWidth={2} />
                {t('filters.clear')}
              </button>
            )}
          </div>
        </div>
      )}

      {!hasTmdbKey && (
        <p className="mb-4 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 py-2 text-xs text-gold">
          {t('discover.demo_notice')}
        </p>
      )}

      {/* Personalized rails, seeded from your library (live data only). */}
      {!searching && tab === 'trending' && <FriendsPopular kind={kind} />}
      {!searching && tab === 'trending' && <ForYou kind={kind} />}

      {loading && <GridSkeleton />}

      {!loading && error && (
        <EmptyState icon={<WifiOff size={22} strokeWidth={1.5} />} title={t('errors.search_failed')} body="" />
      )}

      {/* People results (shows search only) */}
      {!loading && kind === 'show' && searching && people.length > 0 && (
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
          icon={searching ? <SearchX size={22} strokeWidth={1.5} /> : <Film size={22} strokeWidth={1.5} />}
          title={
            searching
              ? t('discover.no_results', { query: query.trim() })
              : tab === 'filters'
                ? t('filters.no_matches')
                : t('discover.empty_title')
          }
          body={searching || tab === 'filters' ? '' : t('discover.empty_body')}
        />
      )}

      {!loading && kind === 'show' && results && results.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {results.map((s) => (
            <ShowCard key={s.id} show={s} subtitle={s.firstAirDate?.slice(0, 4)} />
          ))}
        </div>
      )}

      {!loading && kind === 'movie' && movies && movies.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}

      {/* Load more — browse grids only (search returns a single page). */}
      {!loading && !searching && hasTmdbKey && !exhausted && hasResults && hasResults.length > 0 && (
        <div className="mt-6 flex justify-center">
          <button onClick={loadMore} disabled={loadingMore} className="btn-ghost text-sm">
            {loadingMore ? t('common.loading') : t('discover.load_more')}
          </button>
        </div>
      )}

      {person && <PersonModal person={person} onClose={() => setPerson(null)} />}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="rounded-xl border border-overlay/[0.08] bg-navy-800 px-3 py-2 text-sm font-semibold text-fg outline-none focus:border-gold/50"
    >
      {children}
    </select>
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
