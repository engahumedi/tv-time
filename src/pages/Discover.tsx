import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  searchShows,
  searchPeople,
  getTrending,
  getTopRated,
  discoverByGenre,
  getGenreList,
  hasTmdbKey,
  type Person,
} from '../lib/tmdb';
import { ShowCard } from '../components/ShowCard';
import { PersonCard } from '../components/PersonCard';
import { PersonModal } from '../components/PersonModal';
import { EmptyState } from '../components/EmptyState';
import type { Show } from '../types';

type Tab = 'search' | 'trending' | 'top' | 'genres';

export function Discover() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('trending');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Show[] | null>(null);
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

  // Search (debounced).
  useEffect(() => {
    if (tab !== 'search') return;
    clearTimeout(debounce.current);
    const q = query.trim();
    if (!q) {
      setResults(hasTmdbKey ? null : []);
      setPeople([]);
      if (!hasTmdbKey) searchShows('').then(setResults);
      return;
    }
    setLoading(true);
    setError(false);
    debounce.current = setTimeout(async () => {
      try {
        const [shows, ppl] = await Promise.all([
          searchShows(q),
          hasTmdbKey ? searchPeople(q) : Promise.resolve([]),
        ]);
        setResults(shows);
        setPeople(ppl.filter((p) => p.profilePath).slice(0, 8));
      } catch {
        setError(true);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounce.current);
  }, [query, tab]);

  // Browse tabs.
  useEffect(() => {
    if (tab === 'search') return;
    setLoading(true);
    setError(false);
    setResults(null);
    const load =
      tab === 'trending'
        ? getTrending()
        : tab === 'top'
          ? getTopRated()
          : genreId
            ? discoverByGenre(genreId)
            : Promise.resolve([]);
    load
      .then(setResults)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tab, genreId]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'trending', label: t('discover.tab_trending') },
    { key: 'top', label: t('discover.tab_top') },
    { key: 'genres', label: t('discover.tab_genres') },
    { key: 'search', label: t('discover.tab_search') },
  ];

  return (
    <div className="pt-2">
      <h1 className="mb-4 text-3xl font-extrabold lg:text-4xl">
        {t('discover.title')}
      </h1>

      {hasTmdbKey && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === tb.key
                  ? 'bg-gold text-white'
                  : 'bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1]'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'search' && (
        <div className="relative mx-auto mb-5 max-w-2xl lg:mx-0">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-zinc-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('discover.placeholder')}
            className="w-full rounded-2xl border border-white/[0.08] bg-navy-800 py-3 ps-11 pe-4 text-base outline-none transition-colors placeholder:text-zinc-500 focus:border-gold/60"
            autoFocus
          />
        </div>
      )}

      {tab === 'genres' && (
        <div className="no-scrollbar -mx-4 mb-4 flex flex-wrap gap-2 px-4 lg:mx-0 lg:px-0">
          {genres.map((g) => (
            <button
              key={g.id}
              onClick={() => setGenreId(g.id)}
              className={`chip ${
                genreId === g.id
                  ? 'bg-gold/20 text-gold-400'
                  : 'bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1]'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {!hasTmdbKey && (
        <p className="mb-4 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold-400">
          {t('discover.demo_notice')}
        </p>
      )}

      {loading && <GridSkeleton />}

      {!loading && error && (
        <EmptyState icon="📡" title={t('errors.search_failed')} body="" />
      )}

      {/* People results (search only) */}
      {!loading && tab === 'search' && people.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">
            {t('discover.people')}
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {people.map((p) => (
              <PersonCard key={p.id} person={p} onClick={() => setPerson(p)} />
            ))}
          </div>
        </section>
      )}

      {!loading && !error && results && results.length === 0 && (
        <EmptyState
          icon={tab === 'search' && query ? '🤔' : '🍿'}
          title={
            tab === 'search' && query
              ? t('discover.no_results', { query })
              : t('discover.empty_title')
          }
          body={tab === 'search' ? '' : t('discover.empty_body')}
        />
      )}

      {!loading && results && results.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {results.map((s) => (
            <ShowCard key={s.id} show={s} subtitle={s.firstAirDate?.slice(0, 4)} />
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
