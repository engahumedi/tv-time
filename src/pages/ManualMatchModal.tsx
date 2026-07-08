import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchShows } from '../lib/tmdb';
import { Poster } from '../components/Poster';
import type { Show, ParsedShowGroup } from '../types';

/** Lets the user search and link a show the importer couldn't match. */
export function ManualMatchModal({
  group,
  onResolve,
  onSkip,
  onClose,
}: {
  group: ParsedShowGroup;
  onResolve: (show: Show) => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(group.seriesName);
  const [results, setResults] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        setResults(await searchShows(query));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-strong flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-white/5 p-4">
          <h3 className="text-lg font-bold">
            {t('import.manual_search_title', { name: group.seriesName })}
          </h3>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('import.manual_search_placeholder')}
            className="mt-3 w-full rounded-xl border border-white/10 bg-navy-800 px-4 py-2.5 outline-none focus:border-gold/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-lg shimmer" />
              ))}
            </div>
          )}
          {!loading && (
            <div className="grid grid-cols-3 gap-3">
              {results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onResolve(s)}
                  className="group text-start"
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/5 group-hover:ring-gold/50">
                    <Poster path={s.posterPath} alt={s.name} className="h-full w-full" />
                  </div>
                  <p className="mt-1 truncate text-xs font-medium">{s.name}</p>
                  <p className="truncate text-[10px] text-slate-500">
                    {s.firstAirDate?.slice(0, 4)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-white/5 p-3">
          <button className="btn-ghost flex-1 text-sm" onClick={onSkip}>
            {t('import.manual_skip')}
          </button>
          <button className="btn-ghost text-sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
