import { Link } from 'react-router-dom';
import { Check, Bookmark } from 'lucide-react';
import { Poster } from './Poster';
import { TmdbRating } from './Rating';
import { useMovie } from '../lib/hooks';
import { setMovieWatched, setMovieWatchlist } from '../lib/repo';
import { getMovieDetail } from '../lib/tmdb';
import { celebrate } from '../lib/celebrate';
import type { Movie } from '../types';

/**
 * Poster tile for a movie. A single confident action — the check toggles
 * "watched", adding the movie to the library (with runtime) on first mark.
 */
export function MovieCard({ movie }: { movie: Movie }) {
  const stored = useMovie(movie.id);
  const watched = stored?.watched ?? false;
  const onWatchlist = (stored?.watchlist ?? false) && !watched;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (watched) {
      await setMovieWatched(stored ?? movie, false);
      return;
    }
    // Enrich with runtime the first time we mark it watched.
    let full = stored ?? movie;
    if (!full.runtime) {
      try {
        full = { ...(await getMovieDetail(movie.id)), addedAt: full.addedAt };
      } catch {
        /* keep the lightweight record if detail fails */
      }
    }
    await setMovieWatched(full, true);
    celebrate('small');
  }

  async function toggleWatchlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await setMovieWatchlist(stored ?? movie, !onWatchlist);
  }

  return (
    <div className="group block w-full animate-fade-up">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-overlay/[0.08] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:ring-overlay/25">
        <Link to={`/movie/${movie.id}`} className="block h-full w-full">
          <Poster path={movie.posterPath} alt={movie.title} className="h-full w-full" />
        </Link>
        <TmdbRating value={movie.voteAverage} className="pointer-events-none absolute end-1.5 top-1.5" />
        {!watched && (
          <button
            onClick={toggleWatchlist}
            aria-label="Watchlist"
            aria-pressed={onWatchlist}
            className={`absolute bottom-1.5 start-1.5 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition-colors ${
              onWatchlist
                ? 'border-gold bg-gold/90 text-navy-950'
                : 'border-white/30 bg-black/45 text-white hover:border-gold hover:text-gold'
            }`}
          >
            <Bookmark size={16} strokeWidth={2.25} fill={onWatchlist ? 'currentColor' : 'none'} />
          </button>
        )}
        <button
          onClick={toggle}
          aria-label="Watched"
          className={`absolute bottom-1.5 end-1.5 grid h-8 w-8 place-items-center rounded-full border backdrop-blur-sm transition-colors ${
            watched
              ? 'border-gold bg-gold text-navy-950'
              : 'border-white/30 bg-black/45 text-white hover:border-gold hover:text-gold'
          }`}
        >
          <Check size={17} strokeWidth={2.25} />
        </button>
      </div>
      <Link to={`/movie/${movie.id}`} className="mt-2 block truncate text-sm font-semibold text-fg hover:underline">
        {movie.title}
      </Link>
      {movie.releaseDate && (
        <p className="truncate text-xs text-faint">{movie.releaseDate.slice(0, 4)}</p>
      )}
    </div>
  );
}
