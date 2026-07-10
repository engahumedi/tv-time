import { useEffect, useMemo, useState, lazy, Suspense, type ComponentType } from 'react';
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
import {
  ChevronRight,
  Heart,
  Clapperboard,
  Plus,
  Sprout,
  Popcorn,
  Rabbit,
  Award,
  Clock,
  Hourglass,
  Library,
  Trophy,
  Flame,
  Star,
  CheckCircle2,
  type LucideProps,
} from 'lucide-react';
import { useLibrary, useAllWatches, useLists, useMovies } from '../lib/hooks';
import { computeStats, computeBadges, breakdownTime } from '../lib/stats';
import { formatNumber } from '../lib/format';
import { img } from '../lib/tmdb';
import { getDisplayName } from '../lib/settings';
import { useAuth } from '../lib/auth';
import { ShowCard } from '../components/ShowCard';
import { MovieCard } from '../components/MovieCard';
import { NewListModal } from '../components/NewListModal';
import { FollowStats } from '../components/FollowStats';
import { getMyProfile } from '../lib/social';
import { Share2 } from 'lucide-react';

const ShareProfileModal = lazy(() =>
  import('../components/ShareProfileModal').then((m) => ({ default: m.ShareProfileModal })),
);

const GOLD = '#c9a24b';
const GOLD_DIM = 'rgba(201,162,75,0.32)';

/** Thin-line milestone icons, keyed by badge id (replaces emoji). */
const BADGE_ICONS: Record<string, ComponentType<LucideProps>> = {
  first_steps: Sprout,
  binger: Popcorn,
  marathoner: Rabbit,
  century: Award,
  day_one: Clock,
  time_lord: Hourglass,
  collector: Library,
  completionist: Trophy,
};

export function Profile() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const shows = useLibrary();
  const watches = useAllWatches();
  const lists = useLists();
  const movies = useMovies();
  const { user } = useAuth();

  const stats = useMemo(
    () => (shows && watches ? computeStats(shows, watches) : null),
    [shows, watches],
  );
  const badges = useMemo(() => (stats ? computeBadges(stats) : []), [stats]);
  const [creatingList, setCreatingList] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getMyProfile()
      .then((p) => {
        setAvatarUrl(p?.avatarUrl ?? null);
        setUsername(p?.username ?? null);
      })
      .catch(() => {});
  }, [user]);

  if (!stats || !shows) {
    return <div className="pt-16 text-center text-faint">{t('common.loading')}</div>;
  }

  const time = breakdownTime(stats.totalMinutes);
  const watchedMovies = (movies ?? []).filter((m) => m.watched);
  const movieMinutes = watchedMovies.reduce((a, m) => a + (m.runtime || 0), 0);
  const movieTime = breakdownTime(movieMinutes);
  const favorites = shows.filter((s) => s.favorite);
  const favoriteMovies = (movies ?? []).filter((m) => m.favorite);
  const heroShow = favorites[0] ?? shows[0];
  const heroBackdrop = img(heroShow?.backdropPath, 'w780');
  const name =
    getDisplayName() || user?.email?.split('@')[0] || t('profile.guest');

  return (
    <div className="-mx-4 lg:-mx-10">
      {/* Header backdrop */}
      <div className="relative h-40 w-full overflow-hidden lg:h-56">
        {heroBackdrop ? (
          <img src={heroBackdrop} alt="" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: 'radial-gradient(100% 100% at 20% 0%, rgba(201,162,75,0.18), transparent 60%), rgb(var(--card))' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent" />
      </div>

      {/* relative z-10 so this content paints above the positioned backdrop
          (positioned siblings otherwise paint over later static content). */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 lg:px-10">
        {/* Avatar + name */}
        <div className="-mt-10 mb-8 flex items-end gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-20 w-20 shrink-0 rounded-full border-4 border-navy-950 object-cover" />
          ) : (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-navy-950 bg-navy-700 font-display text-3xl text-muted">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="pb-1">
            <h1 className="text-2xl font-semibold leading-tight">{name}</h1>
            {username && <p className="text-sm text-faint">@{username}</p>}
            {user && <div className="mt-1"><FollowStats userId={user.id} isMe /></div>}
            <div className="flex items-center gap-3">
              <Link to="/settings" className="text-sm text-gold hover:underline">
                {t('settings.title')}
              </Link>
              {user && (
                <button onClick={() => setSharing(true)} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
                  <Share2 size={14} strokeWidth={1.9} /> {t('profile.share')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-10 pb-4">
          {/* Stats — series and movies kept separate */}
          <section>
            <SectionHeader label={t('profile.stats')} />

            {/* Series & Movies — side by side, TV Time style */}
            <div className="mt-4 grid grid-cols-2 gap-3">
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
                lines={[
                  { label: t('profile.movies_watched'), value: formatNumber(watchedMovies.length, lang) },
                ]}
              />
            </div>

            {/* Highlights — streaks, rating, completion */}
            {stats.totalEpisodes > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          </section>

          {/* Lists */}
          <section>
            <SectionHeader label={t('profile.my_lists')} to="/lists" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                onClick={() => setCreatingList(true)}
                className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-overlay/20 text-muted transition-colors hover:border-gold/50 hover:text-gold"
              >
                <Plus size={20} strokeWidth={1.75} />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {t('lists.new')}
                </span>
              </button>
              {(lists ?? []).slice(0, 5).map((l) => (
                <Link
                  key={l.id}
                  to="/lists"
                  className="flex aspect-video flex-col justify-end rounded-lg border border-overlay/[0.08] bg-navy-800 p-3 hover:bg-navy-700"
                >
                  <p className="truncate font-semibold">{l.name}</p>
                  <p className="text-xs text-muted">{t(l.kind === 'movie' ? 'lists.count_movies' : 'lists.count', { n: l.showIds.length })}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Favorites (shows + movies) */}
          {(favorites.length > 0 || favoriteMovies.length > 0) && (
            <section>
              <SectionHeader label={t('show.favorite')} heart />
              {favorites.length > 0 && <PosterRow shows={favorites} />}
              {favoriteMovies.length > 0 && (
                <div className={favorites.length > 0 ? 'mt-3' : ''}>
                  <MoviePosterRow movies={favoriteMovies} />
                </div>
              )}
            </section>
          )}

          {/* Shows */}
          <section>
            <SectionHeader label={t('discover.in_library')} to="/library" />
            <PosterRow shows={shows} />
          </section>

          {/* Movies */}
          {watchedMovies.length > 0 && (
            <section>
              <SectionHeader label={t('profile.your_movies')} to="/library?tab=movies" />
              <MoviePosterRow movies={watchedMovies} />
            </section>
          )}

          {/* Detailed stats */}
          {stats.totalEpisodes > 0 && (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <section>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                    {t('profile.activity')}
                  </h2>
                  {stats.perMonth.length === 0 ? (
                    <p className="text-sm text-faint">{t('profile.no_activity')}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={stats.perMonth} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                        <XAxis dataKey="label" tick={{ fill: '#8a8a86', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: '#6a6a66', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                        <Tooltip cursor={{ fill: 'rgba(128,128,128,0.1)' }} contentStyle={tooltipStyle} labelStyle={{ color: 'rgb(var(--fg))' }} />
                        <Bar dataKey="count" fill={GOLD} radius={[3, 3, 0, 0]} maxBarSize={26} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </section>

                {stats.topGenres.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                      {t('profile.top_genres')}
                    </h2>
                    <ResponsiveContainer width="100%" height={stats.topGenres.length * 38 + 10}>
                      <BarChart layout="vertical" data={stats.topGenres} margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="genre" tick={{ fill: '#8a8a86', fontSize: 12 }} axisLine={false} tickLine={false} width={90} />
                        <Tooltip cursor={{ fill: 'rgba(128,128,128,0.1)' }} contentStyle={tooltipStyle} />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={18}>
                          {stats.topGenres.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? GOLD : GOLD_DIM} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </section>
                )}
              </div>

              {/* Watch pattern by weekday */}
              {stats.perWeekday.some((d) => d.count > 0) && (
                <section>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                    {t('profile.by_weekday')}
                  </h2>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart
                      data={stats.perWeekday.map((d) => ({
                        ...d,
                        label: weekdayLabels(lang)[d.weekday],
                      }))}
                      margin={{ top: 8, right: 4, bottom: 0, left: -20 }}
                    >
                      <XAxis dataKey="label" tick={{ fill: '#8a8a86', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6a6a66', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                      <Tooltip cursor={{ fill: 'rgba(128,128,128,0.1)' }} contentStyle={tooltipStyle} labelStyle={{ color: 'rgb(var(--fg))' }} />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
                        {stats.perWeekday.map((d, i) => {
                          const peak = Math.max(...stats.perWeekday.map((x) => x.count));
                          return <Cell key={i} fill={d.count === peak && peak > 0 ? GOLD : GOLD_DIM} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </section>
              )}

              {/* Milestones */}
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                  {t('profile.badges')}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {badges.map((b) => {
                    const Icon = BADGE_ICONS[b.key] ?? Award;
                    return (
                      <div
                        key={b.key}
                        className={`rounded-lg border border-overlay/[0.08] p-3.5 ${b.earned ? 'bg-navy-800' : 'opacity-55'}`}
                      >
                        <Icon
                          size={22}
                          strokeWidth={1.5}
                          className={b.earned ? 'text-gold' : 'text-muted'}
                        />
                        <p className="mt-2 text-xs font-semibold">{t(`badges.${b.key}`)}</p>
                        <p className="mt-0.5 text-[10px] leading-tight text-faint">{t(`badges.${b.key}_desc`)}</p>
                        {!b.earned && (
                          <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-overlay/10">
                            <div className="h-full rounded-full bg-gold" style={{ width: `${b.progress * 100}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <Link to="/wrapped" className="btn-gold w-full sm:w-auto">
                <Clapperboard size={17} strokeWidth={1.75} />
                {t('profile.year_in_review')}
              </Link>
            </>
          )}
        </div>
      </div>

      {creatingList && <NewListModal onClose={() => setCreatingList(false)} />}
      {sharing && user && (
        <Suspense fallback={null}>
          <ShareProfileModal userId={user.id} onClose={() => setSharing(false)} />
        </Suspense>
      )}
    </div>
  );
}

function SectionHeader({ label, to, heart }: { label: string; to?: string; heart?: boolean }) {
  const inner = (
    <div className="mb-4 flex items-center gap-2">
      {heart && <Heart size={17} strokeWidth={2} className="text-gold" />}
      <h2 className="text-xl font-semibold">{label}</h2>
      {to && <ChevronRight size={18} strokeWidth={2} className="rtl-flip text-muted" />}
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

function MoviePosterRow({ movies }: { movies: import('../types').Movie[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      {movies.map((m) => (
        <div key={m.id} className="w-28 shrink-0">
          <MovieCard movie={m} />
        </div>
      ))}
    </div>
  );
}

/**
 * A single stats card (Series or Movies): time watched as the headline, then a
 * couple of counter rows. Two of these sit side by side, TV Time style.
 */
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold">
        {title}
      </p>
      <p className="mt-3 font-display text-2xl font-semibold leading-none tabular-nums lg:text-3xl">
        {formatNumber(time.days, lang)}
        <span className="ms-0.5 me-2 text-sm font-normal text-muted">{t('common.days')}</span>
        {formatNumber(time.hours, lang)}
        <span className="ms-0.5 text-sm font-normal text-muted">{t('common.hours')}</span>
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-faint">
        {t('profile.time_watched')}
      </p>
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

const tooltipStyle = {
  background: 'rgb(var(--card))',
  border: '1px solid rgb(var(--overlay) / 0.12)',
  borderRadius: 8,
  color: 'rgb(var(--fg))',
  fontSize: 12,
} as const;

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

/** Short localized weekday labels, index 0 = Sunday … 6 = Saturday. */
function weekdayLabels(lang: string): string[] {
  const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : undefined, { weekday: 'short' });
  // 2023-01-01 was a Sunday — walk seven days to get locale-correct labels.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
}
