import { useState } from 'react';

function Star({ fill, size }: { fill: number; size: number }) {
  // fill: 0..1 portion of the star that is coloured.
  const id = `st-${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#d6b56c" />
          <stop offset={`${fill * 100}%`} stopColor="rgba(255,255,255,0.14)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.6l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.3 19.7l1.4-6.3-4.8-4.3 6.4-.6z"
        fill={`url(#${id})`}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.75"
      />
    </svg>
  );
}

/**
 * Star rating input/display. `max` stars; `allowHalf` enables half-star
 * precision (used for the /10 show rating rendered as 5 stars).
 */
export function StarRating({
  value,
  max = 5,
  size = 22,
  allowHalf = false,
  readOnly = false,
  onChange,
  ariaLabel,
}: {
  value: number;
  max?: number;
  size?: number;
  allowHalf?: boolean;
  readOnly?: boolean;
  onChange?: (value: number) => void;
  ariaLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  function pick(v: number) {
    if (readOnly || !onChange) return;
    // Tapping the current value again clears the rating.
    onChange(v === value ? 0 : v);
  }

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={readOnly ? 'img' : 'slider'}
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuemax={max}
      onMouseLeave={() => setHover(null)}
    >
      {Array.from({ length: max }, (_, idx) => {
        const i = idx + 1;
        const fill = Math.max(0, Math.min(1, shown - (i - 1)));
        return (
          <span key={i} className="relative inline-flex" style={{ width: size, height: size }}>
            <Star fill={fill} size={size} />
            {!readOnly && (
              <>
                {allowHalf && (
                  <button
                    type="button"
                    aria-label={`${i - 0.5}`}
                    className="absolute inset-y-0 start-0 w-1/2 cursor-pointer"
                    onMouseEnter={() => setHover(i - 0.5)}
                    onClick={() => pick(i - 0.5)}
                  />
                )}
                <button
                  type="button"
                  aria-label={`${i}`}
                  className={`absolute inset-y-0 end-0 cursor-pointer ${allowHalf ? 'w-1/2' : 'w-full start-0'}`}
                  onMouseEnter={() => setHover(i)}
                  onClick={() => pick(i)}
                />
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}
