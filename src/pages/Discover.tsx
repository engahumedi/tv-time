import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchShows, hasTmdbKey } from '../lib/tmdb';
import { ShowCard } from '../components/ShowCard';
import { EmptyState } from '../components/EmptyState';
import type { Show } from '../types';

export function Discover() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Show[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // In demo mode, show the full sample library up front.
  useEffect(() => {
    if (!hasTmdbKey) {
      searchShows('').then(setResults).catch(() => setError(true));
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      if (hasTmdbKey) setResults(null);
      return;
    }
    setLoading(true);
    setError(false);
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await searchShows(q));
      } catch {
        setError(true);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const showEmpty = useMemo(
    () => !query.trim() && hasTmdbKey && (results === null || results.length === 0),
    [query, results],
  );

  return (
    <div className="pt-2">
      <h1 className="mb-3 text-2xl font-extrabold">{t('discover.title')}</h1>

      <div className="sticky top-14 z-20 -mx-4 mb-4 bg-navy-950/80 px-4 py-2 backdrop-blur-md">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('discover.placeholder')}
            className="w-full rounded-2xl border border-white/10 bg-navy-800/70 py-3 ps-11 pe-4 text-base outline-none transition-colors placeholder:text-slate-500 focus:border-gold/50"
            autoFocus
          />
        </div>
      </div>

      {!hasTmdbKey && (
        <p className="mb-4 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold-400">
          {t('discover.demo_notice')}
        </p>
      )}

      {loading && <GridSkeleton />}

      {!loading && error && (
        <EmptyState icon="📡" title={t('errors.search_failed')} body="" />
      )}

      {!loading && !error && showEmpty && (
        <EmptyState
          icon="🔍"
          title={t('discover.empty_title')}
          body={t('discover.empty_body')}
        />
      )}

      {!loading && !error && results && results.length === 0 && query.trim() && (
        <EmptyState
          icon="🤔"
          title={t('discover.no_results', { query })}
          body=""
        />
      )}

      {!loading && results && results.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {results.map((s) => (
            <ShowCard
              key={s.id}
              show={s}
              subtitle={s.firstAirDate?.slice(0, 4)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] rounded-xl shimmer" />
      ))}
    </div>
  );
}
