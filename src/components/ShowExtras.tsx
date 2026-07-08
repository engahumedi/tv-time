import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getShowExtras,
  getRecommendations,
  img,
  type CastMember,
} from '../lib/tmdb';
import { ShowCard } from './ShowCard';
import type { Show } from '../types';

/** Trailer, cast and recommendations for a show (live TMDB data only). */
export function ShowExtras({ showId }: { showId: number }) {
  const { t } = useTranslation();
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [recs, setRecs] = useState<Show[]>([]);

  useEffect(() => {
    let cancelled = false;
    getShowExtras(showId)
      .then((x) => {
        if (cancelled) return;
        setTrailerKey(x.trailerKey);
        setCast(x.cast);
      })
      .catch(() => {});
    getRecommendations(showId)
      .then((r) => !cancelled && setRecs(r.slice(0, 12)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showId]);

  if (!trailerKey && cast.length === 0 && recs.length === 0) return null;

  return (
    <>
      {trailerKey && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-zinc-400">
            {t('show.trailer')}
          </h2>
          <div className="aspect-video w-full overflow-hidden rounded-2xl ring-1 ring-white/10">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${trailerKey}`}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {cast.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">
            {t('show.cast')}
          </h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {cast.map((c) => {
              const src = img(c.profilePath, 'w200');
              return (
                <div key={c.id} className="w-20 shrink-0 text-center">
                  <div className="aspect-square overflow-hidden rounded-full ring-1 ring-white/10">
                    {src ? (
                      <img src={src} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-navy-700 text-xl text-zinc-500">👤</div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-xs font-semibold">{c.name}</p>
                  <p className="truncate text-[10px] text-zinc-500">{c.character}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {recs.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">
            {t('show.recommendations')}
          </h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {recs.map((s) => (
              <div key={s.id} className="w-28 shrink-0">
                <ShowCard show={s} subtitle={s.firstAirDate?.slice(0, 4)} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
