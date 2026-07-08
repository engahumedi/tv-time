import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLibrary, useAllWatches } from '../lib/hooks';
import { computeStats, breakdownTime } from '../lib/stats';
import { formatWatchTime, formatNumber } from '../lib/format';
import { Clapperboard, Download } from 'lucide-react';
import { downloadShareCard } from '../lib/shareCard';
import { EmptyState } from '../components/EmptyState';

export function Wrapped() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const shows = useLibrary();
  const allWatches = useAllWatches();
  const [allTime, setAllTime] = useState(false);
  const year = new Date().getFullYear();

  const watches = useMemo(() => {
    if (!allWatches) return [];
    if (allTime) return allWatches;
    return allWatches.filter((w) => new Date(w.watchedAt).getFullYear() === year);
  }, [allWatches, allTime, year]);

  const stats = useMemo(
    () => (shows ? computeStats(shows, watches) : null),
    [shows, watches],
  );

  if (!stats) return <div className="pt-16 text-center text-faint">{t('common.loading')}</div>;

  const time = breakdownTime(stats.totalMinutes);
  const topShow = stats.topShows[0];
  const topGenre = stats.topGenres[0];
  const busiest = [...stats.perMonth].sort((a, b) => b.count - a.count)[0];

  function share() {
    downloadShareCard({
      title: allTime ? t('wrapped.all_time') : t('wrapped.year', { year }),
      episodes: formatNumber(stats!.totalEpisodes, lang),
      episodesLabel: t('wrapped.episodes'),
      time: `${time.days}d ${time.hours}h`,
      timeLabel: t('wrapped.time'),
      shows: formatNumber(stats!.totalShows, lang),
      showsLabel: t('wrapped.shows'),
      topShow: topShow?.show.name ?? '—',
      topShowLabel: t('wrapped.top_show'),
      brand: t('app.name'),
    });
  }

  return (
    <div className="pt-2">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold lg:text-4xl">{t('wrapped.title')}</h1>
        <div className="inline-flex rounded-full border border-overlay/10 bg-overlay/5 p-0.5 text-sm">
          <button
            onClick={() => setAllTime(false)}
            className={`rounded-full px-3 py-1 font-semibold ${!allTime ? 'bg-gold text-navy-950' : 'text-fg'}`}
          >
            {year}
          </button>
          <button
            onClick={() => setAllTime(true)}
            className={`rounded-full px-3 py-1 font-semibold ${allTime ? 'bg-gold text-navy-950' : 'text-fg'}`}
          >
            {t('wrapped.all_time')}
          </button>
        </div>
      </div>
      <p className="mb-5 text-sm text-muted">{t('wrapped.subtitle', { year })}</p>

      {stats.totalEpisodes === 0 ? (
        <EmptyState icon={<Clapperboard size={22} strokeWidth={1.5} />} title={t('wrapped.title')} body={t('wrapped.nothing')} />
      ) : (
        <>
          <div
            className="relative overflow-hidden rounded-3xl border border-overlay/[0.07] p-6"
            style={{
              background:
                'radial-gradient(90% 70% at 15% 0%, rgba(201,162,75,0.22), transparent 60%), #121016',
            }}
          >
            <div className="grid gap-6 sm:grid-cols-3">
              <Stat value={formatNumber(stats.totalEpisodes, lang)} label={t('wrapped.episodes')} />
              <Stat value={formatWatchTime(stats.totalMinutes, t)} label={t('wrapped.time')} />
              <Stat value={formatNumber(stats.totalShows, lang)} label={t('wrapped.shows')} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {topShow && (
                <Highlight label={t('wrapped.top_show')} value={topShow.show.name} to={`/show/${topShow.show.id}`} />
              )}
              {topGenre && <Highlight label={t('wrapped.top_genre')} value={topGenre.genre} />}
              {busiest && <Highlight label={t('wrapped.busiest')} value={busiest.label} />}
            </div>
          </div>

          <button className="btn-gold mt-4 w-full sm:w-auto" onClick={share}>
            <Download size={17} strokeWidth={1.75} />
            {t('wrapped.share')}
          </button>
        </>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-bold text-gold lg:text-4xl">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function Highlight({ label, value, to }: { label: string; value: string; to?: string }) {
  const inner = (
    <div className="rounded-2xl bg-overlay/[0.05] p-4">
      <p className="text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 truncate font-bold">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
