import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { useEpisodeCalendar } from '../lib/hooks';
import { img } from '../lib/tmdb';
import { EmptyState } from '../components/EmptyState';
import type { CalendarItem } from '../lib/hooks';

/** Local YYYY-MM-DD key for a timestamp (used to bucket episodes by day). */
function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function Calendar() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const items = useEpisodeCalendar();

  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(dayKey(today.getTime()));

  // Bucket episodes by day for O(1) lookup while rendering the grid.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items ?? []) {
      const k = dayKey(it.ts);
      const arr = map.get(k);
      if (arr) arr.push(it);
      else map.set(k, [it]);
    }
    return map;
  }, [items]);

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : undefined, { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
  }, [lang]);

  const monthLabel = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : undefined, {
    month: 'long',
    year: 'numeric',
  }).format(cursor);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = dayKey(today.getTime());

  // Grid cells: leading blanks to align the 1st, then each day of the month.
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedItems = (byDay.get(selected) ?? []).sort((a, b) => a.ts - b.ts);

  function shiftMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }
  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(todayKey);
  }

  if (items === undefined) {
    return <div className="pt-16 text-center text-faint">{t('common.loading')}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="pt-2">
        <h1 className="mb-4 text-3xl font-bold lg:text-4xl">{t('calendar.title')}</h1>
        <EmptyState
          icon={<CalendarClock size={22} strokeWidth={1.5} />}
          title={t('calendar.empty_title')}
          body={t('calendar.empty_body')}
        />
      </div>
    );
  }

  return (
    <div className="pt-2">
      <h1 className="mb-1 text-3xl font-bold lg:text-4xl">{t('calendar.title')}</h1>
      <p className="mb-5 text-sm text-muted">{t('calendar.subtitle')}</p>

      {/* Month header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button onClick={goToday} className="me-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-overlay/[0.05] hover:text-fg">
            {t('calendar.today')}
          </button>
          <button onClick={() => shiftMonth(-1)} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-overlay/[0.05] hover:text-fg" aria-label={t('calendar.prev_month')}>
            <ChevronLeft size={18} strokeWidth={2} className="rtl-flip" />
          </button>
          <button onClick={() => shiftMonth(1)} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-overlay/[0.05] hover:text-fg" aria-label={t('calendar.next_month')}>
            <ChevronRight size={18} strokeWidth={2} className="rtl-flip" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekdays.map((w) => (
          <div key={w} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-faint">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`b${idx}`} />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayItems = byDay.get(key);
          const isToday = key === todayKey;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`relative flex aspect-square flex-col items-center justify-start rounded-lg border p-1 text-center transition-colors ${
                isSelected
                  ? 'border-gold/60 bg-gold/[0.08]'
                  : 'border-overlay/[0.06] hover:border-overlay/20'
              }`}
            >
              <span
                className={`text-xs font-semibold tabular-nums ${
                  isToday ? 'grid h-5 w-5 place-items-center rounded-full bg-gold text-navy-950' : 'text-fg'
                }`}
              >
                {day}
              </span>
              {dayItems && dayItems.length > 0 && (
                <span className="mt-auto flex flex-wrap items-center justify-center gap-0.5 pb-0.5">
                  {dayItems.slice(0, 3).map((it) => (
                    <span key={it.episode.id} className="h-1.5 w-1.5 rounded-full bg-gold" />
                  ))}
                  {dayItems.length > 3 && (
                    <span className="text-[9px] font-bold text-gold">+{dayItems.length - 3}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day's episodes */}
      <div className="mt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          {new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).format(new Date(`${selected}T00:00:00`))}
        </h3>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-faint">{t('calendar.none_this_day')}</p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {selectedItems.map((it) => (
              <DayRow key={it.episode.id} item={it} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayRow({ item }: { item: CalendarItem }) {
  const { show, episode } = item;
  const thumb = img(episode.stillPath || show.backdropPath, 'w342');
  return (
    <Link
      to={`/show/${show.id}`}
      className="flex overflow-hidden rounded-2xl border border-overlay/[0.07] bg-navy-800 hover:bg-navy-700"
    >
      <div className="w-24 shrink-0 sm:w-28">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: 'radial-gradient(120% 120% at 50% 0%, rgba(201,162,75,0.2), transparent 60%), #15131a' }} />
        )}
      </div>
      <div className="min-w-0 flex-1 p-3">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-fg">{show.name}</p>
        <p className="mt-1 text-base font-bold">
          S{String(episode.seasonNumber).padStart(2, '0')} | E{String(episode.episodeNumber).padStart(2, '0')}
        </p>
        <p className="truncate text-sm text-muted">{episode.name}</p>
      </div>
    </Link>
  );
}
