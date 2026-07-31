/** Small rating pills for TMDB (star) and IMDb ratings. */

export function TmdbRating({
  value,
  className = '',
}: {
  value: number | undefined;
  className?: string;
}) {
  if (!value || value <= 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white/95 backdrop-blur-sm ${className}`}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-gold">
        <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
      </svg>
      {value.toFixed(1)}
    </span>
  );
}

/** Metacritic score, shown on detail pages when OMDb has one. */
export function Metacritic({
  value,
  className = '',
}: {
  value: number | null | undefined;
  className?: string;
}) {
  if (value === null || value === undefined) return null;
  const tone = value >= 61 ? 'bg-[#00ce7a] text-black' : value >= 40 ? 'bg-[#ffbd3f] text-black' : 'bg-[#ff6874] text-black';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold ${tone} ${className}`}
      title="Metacritic"
    >
      <span className="tracking-tight">MC</span>
      {value}
    </span>
  );
}

export function ImdbRating({
  value,
  className = '',
}: {
  value: string | undefined;
  className?: string;
}) {
  if (!value) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md bg-[#f5c518] px-1.5 py-0.5 text-xs font-bold text-black ${className}`}
    >
      <span className="font-bold tracking-tight">IMDb</span>
      {value}
    </span>
  );
}
