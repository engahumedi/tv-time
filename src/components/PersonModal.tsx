import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPersonCredits, img, type Person } from '../lib/tmdb';
import { ShowCard } from './ShowCard';
import type { Show } from '../types';

/** Shows a person's photo and the shows they appear in. */
export function PersonModal({
  person,
  onClose,
}: {
  person: Person;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [shows, setShows] = useState<Show[] | null>(null);
  const src = img(person.profilePath, 'w200');

  useEffect(() => {
    let cancelled = false;
    getPersonCredits(person.id)
      .then((r) => !cancelled && setShows(r.shows))
      .catch(() => !cancelled && setShows([]));
    return () => {
      cancelled = true;
    };
  }, [person.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-strong flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 border-b border-white/5 p-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
            {src ? (
              <img src={src} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-navy-700 text-2xl">👤</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-extrabold">{person.name}</h2>
            {person.knownFor && (
              <p className="text-xs text-zinc-400">
                {t('discover.known_for')}: {person.knownFor}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost text-sm">
            {t('common.close')}
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {shows === null ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-xl shimmer" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {shows.map((s) => (
                <div key={s.id} onClick={onClose}>
                  <ShowCard show={s} subtitle={s.firstAirDate?.slice(0, 4)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
