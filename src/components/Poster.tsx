import { useState } from 'react';
import { img } from '../lib/tmdb';

interface PosterProps {
  path: string | null | undefined;
  alt: string;
  size?: 'w200' | 'w342' | 'w500';
  className?: string;
}

/** Poster image with shimmer placeholder and a graceful fallback tile. */
export function Poster({ path, alt, size = 'w342', className = '' }: PosterProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const src = img(path, size);

  if (!src || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-navy-700 text-slate-500 ${className}`}
        aria-label={alt}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <div className="absolute inset-0 shimmer" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`h-full w-full object-cover transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
