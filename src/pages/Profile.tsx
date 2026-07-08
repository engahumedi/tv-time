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
import { useLibrary, useAllWatches, useLists } from '../lib/hooks';
import { computeStats, computeBadges, breakdownTime } from '../lib/stats';
import { formatNumber } from '../lib/format';
import { img } from '../lib/tmdb';
import { getDisplayName } from '../lib/settings';
import { useAuth } from '../lib/auth';
import { ShowCard } from '../components/ShowCard';

const GOLD = '#ff5b45';
const GOLD_DIM = 'rgba(255,91,69,0.32)';

export function Profile() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const shows = useLibrary();
  const watches = useAllWatches();
  const lists = useLists();
  const { user } = useAuth();

  const stats = useMemo(
    () => (shows && watches ? computeStats(shows, watches) : null),
    [shows, watches],
  );
  const badges = useMemo(() => (stats ? computeBadges(stats) : []), [stats]);

  if (!stats || !shows) {
    return <div className="pt-16 text-center text-faint">{t('common.loading')}</div>;
  }

  const time = breakdownTime(stats.totalMinutes);
  const favorites = shows.filter((s) => s.favorite);
  const heroShow = favorites[0] ?? shows[0];
  const heroBackdrop = img(heroShow?.backdropPath, 'w780');
  const name =
    getDisplayName() || user?.email?.split('@')[0] || t('profile.guest');

  return (
    <div className="-mx-4 lg:-mx-10">
      {/* Header backdrop */}
      <div className="relative h-40 w-full overflow-hidden lg:h-56">
        {heroBackdrop ? (
          <img src={heroBackdrop} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: 'radial-gradient(100% 100% at 20% 0%, rgba(255,91,69,0.3), transparent 60%), rgb(var(--card))' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-4 lg:px-10">
        {/* Avatar + name */}
        <div className="-mt-10 mb-6 flex items-end gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-navy-950 bg-navy-700 text-3xl text-muted">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-extrabold leading-tight">{name}</h1>
            <Link to="/settings" className="text-sm text-gold-400 hover:underline">
              {t('settings.title')}
            </Link>
          </div>
        </div>

        <div className="space-y-8 pb-4">
          {/* Stats */}
          <section>
            <SectionHeader label={t("profile.stats")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="card p-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-muted">
                  {t('profile.time_watched')}
                </p>
                <div className="flex items-end gap-5">
                  <TimeUnit value={time.days} label={t('common.days')} lang={lang} />
                  <TimeUnit value={time.hours} label={t('common.hours')} lang={lang} />
                  <TimeUnit value={time.minutes} label={t('common.minutes')} lang={lang} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatTile value={formatNumber(stats.totalEpisodes, lang)} label={t('profile.episodes_watched')} />
                <StatTile value={formatNumber(stats.totalShows, lang)} label={t('profile.shows_watched')} />
              </div>
            </div>
          </section>

          {/* Lists */}
          <section>
            <SectionHeader label={t('profile.my_lists')} to="/lists" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Link
                to="/lists"
                className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-dashed border-overlay/20 text-muted hover:border-gold/50 hover:text-gold-400"
              >
                <span className="text-3xl leading-none">+</span>
                <span className="mt-1 text-xs font-bold uppercase tracking-wide">
                  {t('lists.new')}
                </span>
              </Link>
              {(lists ?? []).slice(0, 5).map((l) => (
                <Link
                  key={l.id}
                  to="/lists"
                  className="flex aspect-video flex-col justify-end rounded-2xl border border-overlay/[0.07] bg-navy-800 p-3 hover:bg-navy-700"
                >
                  <p className="truncate font-bold">{l.name}</p>
                  <p className="text-xs text-muted">{t('lists.count', { n: l.showIds.length })}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Favorite shows */}
          {favorites.length > 0 && (
            <section>
              <SectionHeader label={t('show.favorite')} heart />
              <PosterRow shows={favorites} />
            </section>
          )}

          {/* Shows */}
          <section>
            <SectionHeader label={t('discover.in_library')} />
            <PosterRow shows={shows} />
          </section>

          {/* Detailed stats */}
          {stats.totalEpisodes > 0 && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="card p-4">
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
                    {t('profile.activity')}
                  </h2>
                  {stats.perMonth.length === 0 ? (
                    <p className="text-sm text-faint">{t('profile.no_activity')}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats.perMonth} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                        <Tooltip cursor={{ fill: 'rgba(128,128,128,0.12)' }} contentStyle={tooltipStyle} labelStyle={{ color: '#e2e8f0' }} />
                        <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </section>

                {stats.topGenres.length > 0 && (
                  <section className="card p-4">
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
                      {t('profile.top_genres')}
                    </h2>
                    <ResponsiveContainer width="100%" height={stats.topGenres.length * 38 + 10}>
                      <BarChart layout="vertical" data={stats.topGenres} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="genre" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip cursor={{ fill: 'rgba(128,128,128,0.12)' }} contentStyle={tooltipStyle} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                          {stats.topGenres.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? GOLD : GOLD_DIM} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </section>
                )}
              </div>

              {/* Milestones */}
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
                  {t('profile.badges')}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {badges.map((b) => (
                    <div key={b.key} className={`card p-3 text-center ${b.earned ? '' : 'opacity-60'}`}>
                      <div className={`mx-auto mb-1 text-3xl ${b.earned ? '' : 'grayscale'}`}>{b.icon}</div>
                      <p className="text-xs font-bold">{t(`badges.${b.key}`)}</p>
                      <p className="mt-0.5 text-[10px] leading-tight text-faint">{t(`badges.${b.key}_desc`)}</p>
                      {!b.earned && (
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-overlay/10">
                          <div className="h-full rounded-full bg-gold-600" style={{ width: `${b.progress * 100}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <Link to="/wrapped" className="btn-gold w-full sm:w-auto">
                🎬 {t('profile.year_in_review')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label, to, heart }: { label: string; to?: string; heart?: boolean }) {
  const inner = (
    <div className="mb-3 flex items-center gap-2">
      {heart && (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21 3 12a5 5 0 0 1 8-6l1 1 1-1a5 5 0 0 1 8 6z" /></svg>
        </span>
      )}
      <h2 className="text-xl font-extrabold">{label}</h2>
      {to && <span className="text-muted">›</span>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function PosterRow({ shows }: { shows: import('../types').Show[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      {shows.map((s) => (
        <div key={s.id} className="w-28 shrink-0">
          <ShowCard show={s} />
        </div>
      ))}
    </div>
  );
}

const tooltipStyle = {
  background: 'rgb(var(--card))',
  border: '1px solid rgb(var(--overlay) / 0.12)',
  borderRadius: 12,
  color: 'rgb(var(--fg))',
  fontSize: 12,
} as const;

function TimeUnit({ value, label, lang }: { value: number; label: string; lang: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-extrabold text-gold-400 tabular-nums">
        {formatNumber(value, lang)}
      </span>
      <span className="text-[11px] uppercase tracking-wide text-faint">{label}</span>
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="card flex flex-col justify-center p-4">
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
