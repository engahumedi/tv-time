import type { Show, WatchRecord } from '../types';

export interface Stats {
  totalMinutes: number;
  totalEpisodes: number;
  totalShows: number;
  finishedShows: number;
  perMonth: { month: string; label: string; count: number }[];
  topGenres: { genre: string; count: number }[];
  topShows: { show: Show; count: number; minutes: number }[];
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

  const totalMinutes = watches.reduce((a, w) => a + (w.runtime || 0), 0);
  const totalEpisodes = watches.length;

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

  return {
    totalMinutes,
    totalEpisodes,
    totalShows,
    finishedShows,
    perMonth,
    topGenres,
    topShows,
  };
}

export interface Badge {
  key: string;
  earned: boolean;
  /** 0..1 progress toward earning it. */
  progress: number;
  icon: string;
}

/** Milestone badges based on the computed stats. */
export function computeBadges(stats: Stats): Badge[] {
  const hours = stats.totalMinutes / 60;
  const mk = (
    key: string,
    icon: string,
    value: number,
    target: number,
  ): Badge => ({
    key,
    icon,
    earned: value >= target,
    progress: Math.max(0, Math.min(1, value / target)),
  });
  return [
    mk('first_steps', '🌱', stats.totalEpisodes, 1),
    mk('binger', '🍿', stats.totalEpisodes, 100),
    mk('marathoner', '🏃', stats.totalEpisodes, 500),
    mk('century', '💯', stats.totalEpisodes, 1000),
    mk('day_one', '🌗', hours, 24),
    mk('time_lord', '⏳', hours, 1000),
    mk('collector', '📚', stats.totalShows, 10),
    mk('completionist', '🏆', stats.finishedShows, 5),
  ];
}
