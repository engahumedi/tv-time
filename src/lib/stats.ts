import type { Show, WatchRecord } from '../types';

export interface Stats {
  totalMinutes: number;
  totalEpisodes: number;
  totalShows: number;
  finishedShows: number;
  perMonth: { month: string; label: string; count: number }[];
  topGenres: { genre: string; count: number }[];
  topShows: { show: Show; count: number; minutes: number }[];
  /** Episodes watched per weekday, index 0 = Sunday … 6 = Saturday. */
  perWeekday: { weekday: number; count: number }[];
  /** Consecutive-day watch streak ending today (or yesterday), in days. */
  currentStreak: number;
  /** The longest consecutive-day watch streak ever, in days. */
  longestStreak: number;
  /** Average of all episode star ratings the user gave (0 when none rated). */
  averageRating: number;
  /** How many episodes carry a star rating. */
  ratedEpisodes: number;
  /** Share of watched shows that are finished, 0..1. */
  completionRate: number;
}

/** Local midnight (ms) for a timestamp — the "day bucket" a watch falls in. */
function dayIndex(ts: number): number {
  const d = new Date(ts);
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5);
}

/** Longest and current consecutive-day streaks from a set of watched days. */
function computeStreaks(days: Set<number>): { current: number; longest: number } {
  if (days.size === 0) return { current: 0, longest: 0 };
  const sorted = [...days].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  // Current streak counts back from today (or yesterday, so a late-night gap
  // doesn't instantly break a streak the moment the clock rolls over).
  const today = dayIndex(Date.now());
  let current = 0;
  if (days.has(today) || days.has(today - 1)) {
    let cursor = days.has(today) ? today : today - 1;
    while (days.has(cursor)) {
      current++;
      cursor--;
    }
  }
  return { current, longest };
}

/** Break a minute total into days / hours / minutes for display. */
export function breakdownTime(totalMinutes: number): {
  days: number;
  hours: number;
  minutes: number;
} {
  const minutes = Math.floor(totalMinutes);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes - days * 60 * 24) / 60);
  const mins = minutes - days * 60 * 24 - hours * 60;
  return { days, hours, minutes: mins };
}

export function computeStats(
  shows: Show[],
  watches: WatchRecord[],
): Stats {
  const showById = new Map(shows.map((s) => [s.id, s]));

  // Re-watches count: each play adds its runtime and one to the episode tally.
  const playsOf = (w: WatchRecord) => (w.plays && w.plays > 0 ? w.plays : 1);
  const totalMinutes = watches.reduce((a, w) => a + (w.runtime || 0) * playsOf(w), 0);
  const totalEpisodes = watches.reduce((a, w) => a + playsOf(w), 0);

  // Shows that have at least one watched episode.
  const watchedShowIds = new Set(watches.map((w) => w.showId));
  const totalShows = watchedShowIds.size;
  const finishedShows = shows.filter((s) => s.status === 'finished').length;

  // Episodes per month (last 12 months with any activity, chronological).
  const monthCounts = new Map<string, number>();
  for (const w of watches) {
    const d = new Date(w.watchedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const perMonth = [...monthCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, count]) => {
      const [y, m] = month.split('-');
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(
        undefined,
        { month: 'short', year: '2-digit' },
      );
      return { month, label, count };
    });

  // Top genres, weighted by episodes watched per show.
  const genreCounts = new Map<string, number>();
  const showEpisodeCount = new Map<number, number>();
  const showMinutes = new Map<number, number>();
  for (const w of watches) {
    showEpisodeCount.set(w.showId, (showEpisodeCount.get(w.showId) ?? 0) + 1);
    showMinutes.set(w.showId, (showMinutes.get(w.showId) ?? 0) + (w.runtime || 0));
  }
  for (const [showId, count] of showEpisodeCount) {
    const show = showById.get(showId);
    if (!show) continue;
    for (const g of show.genres) {
      genreCounts.set(g, (genreCounts.get(g) ?? 0) + count);
    }
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([genre, count]) => ({ genre, count }));

  const topShows = [...showEpisodeCount.entries()]
    .map(([showId, count]) => ({
      show: showById.get(showId),
      count,
      minutes: showMinutes.get(showId) ?? 0,
    }))
    .filter((x): x is { show: Show; count: number; minutes: number } =>
      Boolean(x.show),
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Episodes per weekday + distinct watched days (for streaks).
  const weekdayCounts = new Array(7).fill(0) as number[];
  const watchedDays = new Set<number>();
  let ratingSum = 0;
  let ratedEpisodes = 0;
  for (const w of watches) {
    const d = new Date(w.watchedAt);
    if (Number.isNaN(d.getTime())) continue;
    weekdayCounts[d.getDay()]++;
    watchedDays.add(dayIndex(w.watchedAt));
    if (w.rating && w.rating > 0) {
      ratingSum += w.rating;
      ratedEpisodes++;
    }
  }
  const perWeekday = weekdayCounts.map((count, weekday) => ({ weekday, count }));
  const { current: currentStreak, longest: longestStreak } = computeStreaks(watchedDays);
  const averageRating = ratedEpisodes ? ratingSum / ratedEpisodes : 0;
  const completionRate = totalShows ? finishedShows / totalShows : 0;

  return {
    totalMinutes,
    totalEpisodes,
    totalShows,
    finishedShows,
    perMonth,
    topGenres,
    topShows,
    perWeekday,
    currentStreak,
    longestStreak,
    averageRating,
    ratedEpisodes,
    completionRate,
  };
}

export interface Badge {
  key: string;
  earned: boolean;
  /** 0..1 progress toward earning it. */
  progress: number;
}

/** Milestone badges based on the computed stats. */
export function computeBadges(stats: Stats): Badge[] {
  const hours = stats.totalMinutes / 60;
  const mk = (key: string, value: number, target: number): Badge => ({
    key,
    earned: value >= target,
    progress: Math.max(0, Math.min(1, value / target)),
  });
  return [
    mk('first_steps', stats.totalEpisodes, 1),
    mk('binger', stats.totalEpisodes, 100),
    mk('marathoner', stats.totalEpisodes, 500),
    mk('century', stats.totalEpisodes, 1000),
    mk('day_one', hours, 24),
    mk('time_lord', hours, 1000),
    mk('collector', stats.totalShows, 10),
    mk('completionist', stats.finishedShows, 5),
  ];
}
