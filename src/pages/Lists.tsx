import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Library } from 'lucide-react';
import { useLists, useLibrary, useMovies } from '../lib/hooks';
import { createList, deleteList } from '../lib/repo';
import { Poster } from '../components/Poster';
import { EmptyState } from '../components/EmptyState';

type Kind = 'show' | 'movie';

export function Lists() {
  const { t } = useTranslation();
  const lists = useLists();
  const library = useLibrary();
  const movies = useMovies();
  const [kind, setKind] = useState<Kind>('show');
  const [name, setName] = useState('');

  const showById = new Map((library ?? []).map((s) => [s.id, s]));
  const movieById = new Map((movies ?? []).map((m) => [m.id, m]));

  const filtered = (lists ?? []).filter((l) => (l.kind ?? 'show') === kind);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createList(name, kind);
    setName('');
  }

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

      {lists && filtered.length === 0 && (
        <EmptyState icon={<Library size={22} strokeWidth={1.5} />} title={t('lists.empty_title')} body={t('lists.empty_body')} />
      )}

      <div className="space-y-6">
        {filtered.map((list) => (
          <section key={list.id}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{list.name}</h2>
                <p className="text-xs text-faint">
                  {t(kind === 'movie' ? 'lists.count_movies' : 'lists.count', { n: list.showIds.length })}
                </p>
              </div>
              <button
                onClick={() => confirm(t('lists.delete_confirm')) && deleteList(list.id)}
                className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-rose-500/10 hover:text-rose-300"
                aria-label={t('common.remove')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" /></svg>
              </button>
            </div>
            {list.showIds.length === 0 ? (
              <p className="text-sm text-faint">{t('lists.empty_body')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {list.showIds.map((id) => {
                  if (kind === 'movie') {
                    const movie = movieById.get(id);
                    if (!movie) return null;
                    return (
                      <Link key={id} to={`/movie/${id}`} className="group block">
                        <div className="aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-overlay/[0.08] group-hover:ring-overlay/25">
                          <Poster path={movie.posterPath} alt={movie.title} className="h-full w-full" />
                        </div>
                        <p className="mt-1.5 truncate text-xs font-medium text-fg">{movie.title}</p>
                      </Link>
                    );
                  }
                  const show = showById.get(id);
                  if (!show) return null;
                  return (
                    <Link key={id} to={`/show/${id}`} className="group block">
                      <div className="aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-overlay/[0.08] group-hover:ring-overlay/25">
                        <Poster path={show.posterPath} alt={show.name} className="h-full w-full" />
                      </div>
                      <p className="mt-1.5 truncate text-xs font-medium text-fg">{show.name}</p>
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
