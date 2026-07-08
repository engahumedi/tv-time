import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCalendar, type CalendarItem } from '../lib/hooks';
import { Poster } from '../components/Poster';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../lib/format';

export function Calendar() {
  const { t, i18n } = useTranslation();
  const items = useCalendar();

  if (items === undefined) return <div className="pt-16 text-center text-zinc-500">{t('common.loading')}</div>;

  if (items.length === 0) {
    return (
      <div className="pt-2">
        <h1 className="mb-4 text-3xl font-extrabold lg:text-4xl">{t('calendar.title')}</h1>
        <EmptyState icon="🗓️" title={t('calendar.empty_title')} body={t('calendar.empty_body')} />
      </div>
    );
  }

  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const weekEnd = dayStart + 7 * 864e5;

  const groups: { key: string; label: string; items: CalendarItem[] }[] = [
    { key: 'recent', label: t('calendar.recent'), items: items.filter((i) => i.ts < dayStart) },
    { key: 'today', label: t('calendar.today'), items: items.filter((i) => i.ts >= dayStart && i.ts < dayStart + 864e5) },
    { key: 'week', label: t('calendar.this_week'), items: items.filter((i) => i.ts >= dayStart + 864e5 && i.ts < weekEnd) },
    { key: 'later', label: t('calendar.later'), items: items.filter((i) => i.ts >= weekEnd) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="pt-2">
      <h1 className="text-3xl font-extrabold lg:text-4xl">{t('calendar.title')}</h1>
      <p className="mb-5 mt-1 text-sm text-zinc-400">{t('calendar.subtitle')}</p>

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.key}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">
              {g.label}
            </h2>
            <div className="grid gap-2 lg:grid-cols-2">
              {g.items.map(({ show, episode, ts }) => (
                <Link
                  key={episode.id}
                  to={`/show/${show.id}`}
                  className="card flex items-center gap-3 p-2.5 hover:bg-navy-700"
                >
                  <Poster path={show.posterPath} alt={show.name} size="w200" className="h-14 w-10 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{show.name}</p>
                    <p className="truncate text-xs text-zinc-400">
                      <span className="text-gold-400">S{episode.seasonNumber} · E{episode.episodeNumber}</span> — {episode.name}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs ${ts >= now ? 'text-gold-400' : 'text-zinc-500'}`}>
                    {formatDate(ts, i18n.language)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
