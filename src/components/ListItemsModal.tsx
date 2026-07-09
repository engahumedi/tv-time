import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Check, Search } from 'lucide-react';
import { useLists, useLibrary, useMovies } from '../lib/hooks';
import { toggleShowInList } from '../lib/repo';
import { Poster } from './Poster';
import type { ShowList } from '../types';

/**
 * Add / remove shows or movies for a specific list — the piece that was
 * missing, so a list can actually be filled without hopping to every detail
 * page. Membership toggles live and reflects immediately.
 */
export function ListItemsModal({ list, onClose }: { list: ShowList; onClose: () => void }) {
  const { t } = useTranslation();
  const kind = list.kind ?? 'show';
  const library = useLibrary();
  const movies = useMovies();
  const lists = useLists();
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Read membership from the live list so toggles update the checkmarks.
  const current = (lists ?? []).find((l) => l.id === list.id) ?? list;
  const inList = new Set(current.showIds);

  const query = q.trim().toLowerCase();
  const items = (kind === 'movie' ? movies ?? [] : library ?? [])
    .map((it) =>
      kind === 'movie'
        ? { id: it.id, title: (it as import('../types').Movie).title, poster: it.posterPath }
        : { id: it.id, title: (it as import('../types').Show).name, poster: it.posterPath },
    )
    .filter((it) => !query || it.title.toLowerCase().includes(query));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-lg font-bold">
            {t('lists.add_here', { name: list.name })}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-fg"
            aria-label={t('common.close')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="relative mb-3">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-faint">
            <Search size={17} strokeWidth={1.75} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('library.search_placeholder')}
            className="w-full rounded-xl border border-overlay/[0.08] bg-navy-800 py-2.5 ps-10 pe-3 text-sm outline-none focus:border-gold/60"
          />
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-faint">{t('lists.nothing_to_add')}</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
            {items.map((it) => {
              const on = inList.has(it.id);
              return (
                <button
                  key={it.id}
                  onClick={() => toggleShowInList(list.id, it.id)}
                  className="group text-start"
                  aria-pressed={on}
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-overlay/[0.08]">
                    <Poster path={it.poster} alt={it.title} className="h-full w-full" />
                    <div className={`absolute inset-0 transition-colors ${on ? 'bg-gold/25' : 'bg-navy-950/40 opacity-0 group-hover:opacity-100'}`} />
                    <span
                      className={`absolute end-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 ${
                        on ? 'border-gold bg-gold text-navy-950' : 'border-white/70 bg-black/40 text-transparent'
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-xs font-medium text-fg">{it.title}</p>
                </button>
              );
            })}
          </div>
        )}

        <button onClick={onClose} className="btn-ghost mt-4 w-full text-sm">
          {t('common.done')}
        </button>
      </motion.div>
    </div>
  );
}
