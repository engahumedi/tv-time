import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLists, useLibrary } from '../lib/hooks';
import { createList, deleteList } from '../lib/repo';
import { Poster } from '../components/Poster';
import { EmptyState } from '../components/EmptyState';

export function Lists() {
  const { t } = useTranslation();
  const lists = useLists();
  const library = useLibrary();
  const [name, setName] = useState('');

  const showById = new Map((library ?? []).map((s) => [s.id, s]));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createList(name);
    setName('');
  }

  return (
    <div className="pt-2">
      <h1 className="mb-4 text-3xl font-extrabold lg:text-4xl">{t('lists.title')}</h1>

      <form onSubmit={create} className="mb-6 flex max-w-md gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('lists.name_placeholder')}
          className="input flex-1"
        />
        <button type="submit" className="btn-gold shrink-0">
          {t('lists.new')}
        </button>
      </form>

      {lists && lists.length === 0 && (
        <EmptyState icon="📚" title={t('lists.empty_title')} body={t('lists.empty_body')} />
      )}

      <div className="space-y-6">
        {(lists ?? []).map((list) => (
          <section key={list.id}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{list.name}</h2>
                <p className="text-xs text-zinc-500">
                  {t('lists.count', { n: list.showIds.length })}
                </p>
              </div>
              <button
                onClick={() => confirm(t('lists.delete_confirm')) && deleteList(list.id)}
                className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300"
                aria-label={t('common.remove')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" /></svg>
              </button>
            </div>
            {list.showIds.length === 0 ? (
              <p className="text-sm text-zinc-500">{t('lists.empty_body')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {list.showIds.map((id) => {
                  const show = showById.get(id);
                  if (!show) return null;
                  return (
                    <Link key={id} to={`/show/${id}`} className="group block">
                      <div className="aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-white/[0.06] group-hover:ring-gold/50">
                        <Poster path={show.posterPath} alt={show.name} className="h-full w-full" />
                      </div>
                      <p className="mt-1.5 truncate text-xs font-medium text-zinc-300">{show.name}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
