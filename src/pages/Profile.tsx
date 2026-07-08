import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import { useLibrary, useAllWatches } from '../lib/hooks';
import { computeStats, computeBadges, breakdownTime } from '../lib/stats';
import { formatNumber } from '../lib/format';
import { EmptyState } from '../components/EmptyState';
import { Poster } from '../components/Poster';
import { exportData, exportWatchesCsv, triggerDownload } from '../lib/exporter';
import { clearAll } from '../lib/repo';

const GOLD = '#e8b84b';
const GOLD_DIM = 'rgba(232,184,75,0.35)';

export function Profile() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const shows = useLibrary();
  const watches = useAllWatches();

  const stats = useMemo(
    () => (shows && watches ? computeStats(shows, watches) : null),
    [shows, watches],
  );
  const badges = useMemo(() => (stats ? computeBadges(stats) : []), [stats]);

  if (!stats) return <div className="pt-16 text-center text-slate-500">{t('common.loading')}</div>;

  const time = breakdownTime(stats.totalMinutes);
  const hasData = stats.totalEpisodes > 0;

  return (
    <div className="space-y-6 pt-2">
      <h1 className="text-2xl font-extrabold">{t('profile.title')}</h1>

      {!hasData ? (
        <EmptyState
          icon="✨"
          title={t('profile.empty_title')}
          body={t('profile.empty_body')}
        >
          <Link to="/import" className="btn-gold">
            {t('home.import_cta')}
          </Link>
        </EmptyState>
      ) : (
        <>
          {/* Hero time-watched */}
          <div className="card overflow-hidden p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              {t('profile.time_watched')}
            </p>
            <div className="mt-2 flex items-end justify-center gap-4">
              <TimeUnit value={time.days} label={t('common.days')} lang={lang} />
              <TimeUnit value={time.hours} label={t('common.hours')} lang={lang} />
              <TimeUnit value={time.minutes} label={t('common.minutes')} lang={lang} />
            </div>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              value={formatNumber(stats.totalEpisodes, lang)}
              label={t('profile.episodes_watched')}
            />
            <StatTile
              value={formatNumber(stats.totalShows, lang)}
              label={t('profile.shows_watched')}
            />
          </div>

          {/* Episodes per month */}
          <section className="card p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              {t('profile.activity')}
            </h2>
            {stats.perMonth.length === 0 ? (
              <p className="text-sm text-slate-500">{t('profile.no_activity')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.perMonth} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Top genres */}
          {stats.topGenres.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                {t('profile.top_genres')}
              </h2>
              <ResponsiveContainer width="100%" height={stats.topGenres.length * 38 + 10}>
                <BarChart
                  layout="vertical"
                  data={stats.topGenres}
                  margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="genre"
                    tick={{ fill: '#cbd5e1', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {stats.topGenres.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? GOLD : GOLD_DIM} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* Top shows */}
          {stats.topShows.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                {t('profile.top_shows')}
              </h2>
              <div className="space-y-2">
                {stats.topShows.map(({ show, count }, i) => (
                  <Link
                    key={show.id}
                    to={`/show/${show.id}`}
                    className="card flex items-center gap-3 p-2.5"
                  >
                    <span className="w-5 text-center text-lg font-extrabold text-gold-400">
                      {i + 1}
                    </span>
                    <Poster
                      path={show.posterPath}
                      alt={show.name}
                      size="w200"
                      className="h-14 w-10 rounded-md"
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {show.name}
                    </span>
                    <span className="text-sm text-slate-400">
                      {formatNumber(count, lang)} {t('common.episodes')}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Badges */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
              {t('profile.badges')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {badges.map((b) => (
                <div
                  key={b.key}
                  className={`card relative overflow-hidden p-3 text-center ${
                    b.earned ? '' : 'opacity-60'
                  }`}
                >
                  <div
                    className={`mx-auto mb-1 text-3xl ${
                      b.earned ? '' : 'grayscale'
                    }`}
                  >
                    {b.icon}
                  </div>
                  <p className="text-xs font-bold">{t(`badges.${b.key}`)}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                    {t(`badges.${b.key}_desc`)}
                  </p>
                  {!b.earned && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gold-600"
                        style={{ width: `${b.progress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Data controls */}
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          {t('profile.export')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-ghost text-sm"
            onClick={async () =>
              triggerDownload(await exportData(), 'showtrack-backup.json')
            }
          >
            {t('profile.export_json')}
          </button>
          <button
            className="btn-ghost text-sm"
            onClick={async () =>
              triggerDownload(await exportWatchesCsv(), 'showtrack-history.csv')
            }
          >
            {t('profile.export_csv')}
          </button>
          <button
            className="btn text-sm text-rose-300 hover:bg-rose-500/10"
            onClick={async () => {
              if (confirm(t('profile.reset_confirm'))) await clearAll();
            }}
          >
            {t('profile.reset')}
          </button>
        </div>
      </section>
    </div>
  );
}

const tooltipStyle = {
  background: '#111a2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#e2e8f0',
  fontSize: 12,
} as const;

function TimeUnit({
  value,
  label,
  lang,
}: {
  value: number;
  label: string;
  lang: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-extrabold text-gold-400 tabular-nums">
        {formatNumber(value, lang)}
      </span>
      <span className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  );
}
