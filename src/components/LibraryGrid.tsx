import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Check, CheckSquare, X, ListPlus, Trash2, Eye } from 'lucide-react';
import { Poster } from './Poster';
import { BulkListModal } from './BulkListModal';
import { markShowWatched, removeShow } from '../lib/repo';
import { celebrate } from '../lib/celebrate';
import type { Show, ShowStatus } from '../types';

type Sort = 'recent' | 'az' | 'rating';
const STATUS_FILTERS: (ShowStatus | 'all')[] = [
  'all',
  'watching',
  'up_to_date',
  'finished',
  'stopped',
  'not_started',
];

/**
 * The full library browser: search, sort and status-filter your shows, and
 * switch on multi-select to mark watched, add to a list, or remove in bulk.
 */
export function LibraryGrid({ shows }: { shows: Show[] }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [status, setStatus] = useState<ShowStatus | 'all'>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showBulkList, setShowBulkList] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = shows.filter((s) => {
      if (status !== 'all' && s.status !== status) return false;
      if (q && !s.name.toLowerCase().includes(q) && !(s.originalName ?? '').toLowerCase().includes(q))
        return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'az') return a.name.localeCompare(b.name);
      if (sort === 'rating') return (b.userRating ?? 0) - (a.userRating ?? 0);
      return b.addedAt - a.addedAt;
    });
    return list;
  }, [shows, query, sort, status]);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  const selectedShows = shows.filter((s) => selected.has(s.id));

  async function bulkWatched() {
    for (const s of selectedShows) await markShowWatched(s.id, s.episodeRuntime);
    celebrate('big');
    exitSelect();
  }

  async function bulkRemove() {
    if (!confirm(t('library.remove_confirm', { n: selectedShows.length }))) return;
    for (const s of selectedShows) await removeShow(s.id);
    exitSelect();
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-faint">
              <Search size={17} strokeWidth={1.75} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('library.search_placeholder')}
              className="w-full rounded-xl border border-overlay/[0.08] bg-navy-800 py-2.5 ps-10 pe-3 text-sm outline-none transition-colors placeholder:text-faint focus:border-gold/60"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="shrink-0 rounded-xl border border-overlay/[0.08] bg-navy-800 px-3 py-2.5 text-sm font-semibold outline-none focus:border-gold/50"
            aria-label={t('library.sort')}
          >
            <option value="recent">{t('library.sort_recent')}</option>
            <option value="az">{t('library.sort_az')}</option>
            <option value="rating">{t('library.sort_rating')}</option>
          </select>
          <button
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors ${
              selectMode
                ? 'border-gold bg-gold/12 text-gold'
                : 'border-overlay/[0.08] text-muted hover:text-fg'
            }`}
            aria-label={t('library.select')}
            aria-pressed={selectMode}
          >
            <CheckSquare size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === s
                  ? 'bg-gold/12 text-gold ring-1 ring-inset ring-gold/30'
                  : 'text-muted hover:bg-overlay/[0.05] hover:text-fg'
              }`}
            >
              {s === 'all' ? t('library.filter_all') : t(`status.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-sm text-faint">{t('library.no_matches')}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {filtered.map((s) => {
            const isSel = selected.has(s.id);
            const inner = (
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-overlay/[0.08] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:ring-overlay/25">
                <Poster
                  path={s.posterPath}
                  alt={s.name}
                  className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                />
                {selectMode && (
                  <>
                    <div className={`absolute inset-0 transition-colors ${isSel ? 'bg-gold/25' : 'bg-navy-950/30'}`} />
                    <span
                      className={`absolute end-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 ${
                        isSel ? 'border-gold bg-gold text-navy-950' : 'border-white/70 bg-black/40 text-transparent'
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                  </>
                )}
              </div>
            );
            return selectMode ? (
              <button key={s.id} onClick={() => toggleSelect(s.id)} className="group block w-full text-start">
                {inner}
                <p className="mt-2 truncate text-sm font-semibold text-fg">{s.name}</p>
              </button>
            ) : (
              <Link key={s.id} to={`/show/${s.id}`} className="group block w-full animate-fade-up">
                {inner}
                <p className="mt-2 truncate text-sm font-semibold text-fg">{s.name}</p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4 lg:bottom-6 lg:ps-64">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-overlay/10 bg-navy-800/95 p-2 shadow-lift backdrop-blur-xl">
            <span className="ps-2 text-sm font-semibold">
              {t('library.selected', { n: selected.size })}
            </span>
            <div className="ms-auto flex items-center gap-1">
              <button onClick={bulkWatched} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted hover:bg-overlay/[0.06] hover:text-gold" title={t('show.mark_show_watched')}>
                <Eye size={16} strokeWidth={1.9} />
                <span className="hidden sm:inline">{t('library.mark_watched')}</span>
              </button>
              <button onClick={() => setShowBulkList(true)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted hover:bg-overlay/[0.06] hover:text-gold" title={t('show.add_to_list')}>
                <ListPlus size={16} strokeWidth={1.9} />
                <span className="hidden sm:inline">{t('library.add_to_list')}</span>
              </button>
              <button onClick={bulkRemove} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted hover:bg-rose-500/10 hover:text-rose-300" title={t('common.remove')}>
                <Trash2 size={16} strokeWidth={1.9} />
                <span className="hidden sm:inline">{t('common.remove')}</span>
              </button>
              <button onClick={exitSelect} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-overlay/[0.06] hover:text-fg" aria-label={t('common.cancel')}>
                <X size={17} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkList && (
        <BulkListModal
          itemIds={[...selected]}
          onClose={() => setShowBulkList(false)}
          onDone={() => {
            setShowBulkList(false);
            exitSelect();
          }}
        />
      )}
    </div>
  );
}
