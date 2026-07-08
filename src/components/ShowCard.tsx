import { Link } from 'react-router-dom';
import { Poster } from './Poster';
import type { Show } from '../types';

/** Poster tile used across grids and rails. */
export function ShowCard({
  show,
  subtitle,
  width = 'w-full',
}: {
  show: Show;
  subtitle?: string;
  width?: string;
}) {
  return (
    <Link
      to={`/show/${show.id}`}
      className={`group block ${width} animate-fade-up`}
    >
      <div className="aspect-[2/3] overflow-hidden rounded-xl shadow-glass ring-1 ring-white/5 transition-transform duration-300 group-hover:-translate-y-1 group-hover:ring-gold/40">
        <Poster
          path={show.posterPath}
          alt={show.name}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-slate-200">
        {show.name}
      </p>
      {subtitle && (
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      )}
    </Link>
  );
}
