import { User } from 'lucide-react';
import { img } from '../lib/tmdb';
import type { Person } from '../lib/tmdb';

/** Circular person avatar + name, used in Discover people results. */
export function PersonCard({
  person,
  onClick,
}: {
  person: Person;
  onClick: () => void;
}) {
  const src = img(person.profilePath, 'w200');
  return (
    <button onClick={onClick} className="group block text-center">
      <div className="mx-auto aspect-square w-full overflow-hidden rounded-full ring-1 ring-overlay/10 transition-all group-hover:ring-gold/50">
        {src ? (
          <img src={src} alt={person.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-navy-700 text-faint">
            <User size={28} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-xs font-semibold text-fg">
        {person.name}
      </p>
    </button>
  );
}
