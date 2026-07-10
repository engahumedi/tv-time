import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getWatchProviders, img, type WatchProvider } from '../lib/tmdb';

/** "Where to watch" strip: streaming provider logos for a title, if any. */
export function WhereToWatch({ kind, id }: { kind: 'tv' | 'movie'; id: number }) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<WatchProvider[] | null>(null);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWatchProviders(kind, id)
      .then((r) => {
        if (cancelled) return;
        setProviders(r.providers);
        setLink(r.link);
      })
      .catch(() => !cancelled && setProviders([]));
    return () => { cancelled = true; };
  }, [kind, id]);

  if (!providers || providers.length === 0) return null;

  const logos = (
    <div className="flex flex-wrap gap-2">
      {providers.map((p) => {
        const logo = img(p.logo, 'w200');
        return logo ? (
          <img key={p.id} src={logo} alt={p.name} title={p.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-overlay/10" loading="lazy" />
        ) : (
          <span key={p.id} className="rounded-lg bg-overlay/[0.06] px-2 py-1 text-xs">{p.name}</span>
        );
      })}
    </div>
  );

  return (
    <section>
      <h2 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-muted">{t('detail.where_to_watch')}</h2>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-block">
          {logos}
        </a>
      ) : (
        logos
      )}
    </section>
  );
}
