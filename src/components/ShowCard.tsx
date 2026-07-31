import { Link } from 'react-router-dom';
import { Poster } from './Poster';
import { PosterRating } from './PosterRating';
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
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-overlay/[0.08] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:ring-overlay/25">
        <Poster
          path={show.posterPath}
          alt={show.name}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <PosterRating kind="tv" tmdbId={show.id} fallback={show.voteAverage} className="absolute end-1.5 top-1.5" />
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-fg">
        {show.name}
      </p>
      {subtitle && (
        <p className="truncate text-xs text-faint">{subtitle}</p>
      )}
    </Link>
  );
}
