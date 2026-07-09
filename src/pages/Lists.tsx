import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Library, Plus, Trash2, X } from 'lucide-react';
import { useLists, useLibrary, useMovies } from '../lib/hooks';
import { deleteList, toggleShowInList } from '../lib/repo';
import { Poster } from '../components/Poster';
import { EmptyState } from '../components/EmptyState';
import { NewListModal } from '../components/NewListModal';
import { ListItemsModal } from '../components/ListItemsModal';
import type { ShowList } from '../types';

type Kind = 'show' | 'movie';

export function Lists() {
  const { t } = useTranslation();
  const lists = useLists();
  const library = useLibrary();
  const movies = useMovies();
  const [kind, setKind] = useState<Kind>('show');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ShowList | null>(null);

  const showById = new Map((library ?? []).map((s) => [s.id, s]));
  const movieById = new Map((movies ?? []).map((m) => [m.id, m]));

  const filtered = (lists ?? []).filter((l) => (l.kind ?? 'show') === kind);

  return (
    <div className="pt-2">
      <h1 className="mb-4 text-3xl font-bold lg:text-4xl">{t('lists.title')}</h1>

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

      <button onClick={() => setCreating(true)} className="btn-gold mb-6">
        <Plus size={17} strokeWidth={2.25} />
        {t('lists.new')}
      </button>

      {creating && (
        <NewListModal defaultKind={kind} onClose={() => setCreating(false)} />
      )}

      {lists && filtered.length === 0 && (
        <EmptyState icon={<Library size={22} strokeWidth={1.5} />} title={t('lists.empty_title')} body={t('lists.empty_body')} />
      )}

      <div className="space-y-6">
        {filtered.map((list) => {
          // Only ids we can actually render (still in the library).
          const presentIds = list.showIds.filter((id) =>
            kind === 'movie' ? movieById.has(id) : showById.has(id),
          );
          return (
            <section key={list.id}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">{list.name}</h2>
                  <p className="text-xs text-faint">
                    {t(kind === 'movie' ? 'lists.count_movies' : 'lists.count', { n: presentIds.length })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditing(list)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted hover:bg-overlay/[0.06] hover:text-gold"
                  >
                    <Plus size={15} strokeWidth={2.25} />
                    {t('lists.add_items')}
                  </button>
                  <button
                    onClick={() => confirm(t('lists.delete_confirm')) && deleteList(list.id)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-rose-500/10 hover:text-rose-300"
                    aria-label={t('common.remove')}
                  >
                    <Trash2 size={16} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
              {presentIds.length === 0 ? (
                <button
                  onClick={() => setEditing(list)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-overlay/20 py-8 text-sm font-semibold text-muted transition-colors hover:border-gold/50 hover:text-gold"
                >
                  <Plus size={17} strokeWidth={2} />
                  {t('lists.add_items')}
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                  {presentIds.map((id) => {
                    const isMovie = kind === 'movie';
                    const item = isMovie ? movieById.get(id)! : showById.get(id)!;
                    const title = isMovie
                      ? (item as import('../types').Movie).title
                      : (item as import('../types').Show).name;
                    return (
                      <div key={id} className="group relative">
                        <Link to={isMovie ? `/movie/${id}` : `/show/${id}`} className="block">
                          <div className="aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-overlay/[0.08] group-hover:ring-overlay/25">
                            <Poster path={item.posterPath} alt={title} className="h-full w-full" />
                          </div>
                          <p className="mt-1.5 truncate text-xs font-medium text-fg">{title}</p>
                        </Link>
                        <button
                          onClick={() => toggleShowInList(list.id, id)}
                          className="absolute end-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-navy-950/70 text-white opacity-0 backdrop-blur transition-opacity hover:bg-rose-500/80 group-hover:opacity-100"
                          aria-label={t('lists.remove_item')}
                          title={t('lists.remove_item')}
                        >
                          <X size={15} strokeWidth={2.5} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {editing && <ListItemsModal list={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
