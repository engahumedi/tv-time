import { useEffect, useRef, useState } from 'react';
import { TmdbRating } from './Rating';
import { getImdbRatingForTmdb, hasRatingsSource } from '../lib/ratings';

/** Compact IMDb pill sized for a poster corner. */
function ImdbPill({ value, className = '' }: { value: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white/95 backdrop-blur-sm ${className}`}
    >
      <span className="rounded-[2px] bg-[#f5c518] px-1 text-[8px] font-black leading-[1.4] tracking-tight text-black">
        IMDb
      </span>
      {value}
    </span>
  );
}

/**
 * Rating badge for a poster. Shows the IMDb score once it's known, falling back
 * to TMDB's until then (or permanently, when a title has no IMDb rating).
 *
 * The look-up only fires when the card scrolls into view, and results are cached
 * for a week, so a long grid doesn't hammer the ratings API.
 */
export function PosterRating({
  kind,
  tmdbId,
  fallback,
  className = '',
}: {
  kind: 'tv' | 'movie';
  tmdbId: number;
  /** TMDB vote average, shown until/unless an IMDb score is available. */
  fallback: number | undefined;
  className?: string;
}) {
  const [imdb, setImdb] = useState<number | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setImdb(null);
    if (!hasRatingsSource || !tmdbId || tmdbId < 0) return;
    const el = anchor.current;
    if (!el) return;
    // Observe the poster itself — the badge can be zero-sized before it loads.
    const target = el.parentElement ?? el;
    let cancelled = false;

    const start = () => {
      getImdbRatingForTmdb(kind, tmdbId)
        .then((r) => {
          if (!cancelled && r !== null) setImdb(r);
        })
        .catch(() => {});
    };

    if (typeof IntersectionObserver === 'undefined') {
      start();
      return () => {
        cancelled = true;
      };
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      // Start early — a screen or so ahead — so the badge is usually already
      // resolved by the time the card is actually on screen.
      { rootMargin: '800px' },
    );
    io.observe(target);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [kind, tmdbId]);

  return (
    <span ref={anchor} className={className}>
      {imdb !== null ? <ImdbPill value={imdb.toFixed(1)} /> : <TmdbRating value={fallback} />}
    </span>
  );
}
