import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { popularAmongFollowing, onSocialChanged, type PopularItem } from '../lib/social';
import { Poster } from './Poster';

/** "Popular with people you follow" — a social discovery rail on Discover. */
export function FriendsPopular({ kind }: { kind: 'show' | 'movie' }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<PopularItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => popularAmongFollowing().then((r) => !cancelled && setItems(r)).catch(() => !cancelled && setItems([]));
    load();
    const off = onSocialChanged(load);
    return () => { cancelled = true; off(); };
  }, []);

  const filtered = (items ?? []).filter((i) => i.kind === kind);
  if (filtered.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
        <Users size={15} strokeWidth={1.9} className="text-gold" />
        {t('discover.popular_with_friends')}
      </h2>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {filtered.map((it) => (
          <Link key={`${it.kind}:${it.id}`} to={`/${it.kind === 'movie' ? 'movie' : 'show'}/${it.id}`} className="w-28 shrink-0">
            <Poster path={it.poster} alt={it.title} className="aspect-[2/3] rounded-lg ring-1 ring-overlay/10" />
            <p className="mt-1.5 truncate text-xs font-semibold">{it.title}</p>
            <p className="truncate text-[11px] text-faint">{t('discover.friends_have', { n: it.count })}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
