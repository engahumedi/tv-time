import { useTranslation } from 'react-i18next';
import { Flame, Award, Star, CheckCircle2, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { formatNumber } from '../lib/format';
import { breakdownTime } from '../lib/stats';
import type { computeStats } from '../lib/stats';

type Stats = ReturnType<typeof computeStats>;

/**
 * The Series | Movies stat cards plus streak/rating/completion highlights —
 * the same block shown on your own profile, reused on other people's profiles
 * so stats look consistent everywhere.
 */
export function ProfileStats({
  stats,
  watchedMovies,
  movieMinutes,
  lang,
}: {
  stats: Stats;
  watchedMovies: number;
  movieMinutes: number;
  lang: string;
}) {
  const { t } = useTranslation();
  const time = breakdownTime(stats.totalMinutes);
  const movieTime = breakdownTime(movieMinutes);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title={t('profile.series')}
          time={time}
          lang={lang}
          lines={[
            { label: t('profile.episodes_watched'), value: formatNumber(stats.totalEpisodes, lang) },
            { label: t('profile.shows_watched'), value: formatNumber(stats.totalShows, lang) },
          ]}
        />
        <StatCard
          title={t('profile.movies')}
          time={movieTime}
          lang={lang}
          lines={[{ label: t('profile.movies_watched'), value: formatNumber(watchedMovies, lang) }]}
        />
      </div>

      {stats.totalEpisodes > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Highlight
            icon={Flame}
            value={t('profile.streak_days', { n: formatNumber(stats.currentStreak, lang) })}
            label={t('profile.current_streak')}
            active={stats.currentStreak > 0}
          />
          <Highlight
            icon={Award}
            value={t('profile.streak_days', { n: formatNumber(stats.longestStreak, lang) })}
            label={t('profile.longest_streak')}
          />
          <Highlight
            icon={Star}
            value={stats.ratedEpisodes ? stats.averageRating.toFixed(1) : '—'}
            label={t('profile.avg_rating')}
          />
          <Highlight
            icon={CheckCircle2}
            value={`${Math.round(stats.completionRate * 100)}%`}
            label={t('profile.completion')}
          />
        </div>
      )}
    </>
  );
}

function StatCard({
  title,
  time,
  lang,
  lines,
}: {
  title: string;
  time: { days: number; hours: number; minutes: number };
  lang: string;
  lines: { label: string; value: string }[];
}) {
  const { t } = useTranslation();
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold">{title}</p>
      <p className="mt-3 font-display text-2xl font-semibold leading-none tabular-nums lg:text-3xl">
        {formatNumber(time.days, lang)}
        <span className="ms-0.5 me-2 text-sm font-normal text-muted">{t('common.days')}</span>
        {formatNumber(time.hours, lang)}
        <span className="ms-0.5 text-sm font-normal text-muted">{t('common.hours')}</span>
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-faint">{t('profile.time_watched')}</p>
      <div className="mt-4 space-y-2 border-t border-overlay/[0.06] pt-3">
        {lines.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm text-muted">{l.label}</span>
            <span className="font-display text-lg font-semibold tabular-nums">{l.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Highlight({
  icon: Icon,
  value,
  label,
  active,
}: {
  icon: ComponentType<LucideProps>;
  value: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="rounded-lg border border-overlay/[0.08] bg-navy-800 p-3.5">
      <Icon size={18} strokeWidth={1.75} className={active ? 'text-gold' : 'text-muted'} />
      <p className="mt-2 font-display text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted">{label}</p>
    </div>
  );
}
