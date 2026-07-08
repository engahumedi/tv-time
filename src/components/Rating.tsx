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
      className={`inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold text-gold-400 backdrop-blur ${className}`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
      </svg>
      {value.toFixed(1)}
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
      <span className="font-extrabold tracking-tight">IMDb</span>
      {value}
    </span>
  );
}
