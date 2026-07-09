import { describe, it, expect } from 'vitest';
import { computeStats, breakdownTime, computeBadges } from './stats';
import type { Show, WatchRecord } from '../types';

const show = (id: number, name: string, genres: string[]): Show => ({
  id,
  name,
  overview: '',
  posterPath: null,
  backdropPath: null,
  firstAirDate: null,
  genres,
  episodeRuntime: 30,
  status: 'watching',
  addedAt: 0,
});

const watch = (
  showId: number,
  s: number,
  e: number,
  runtime: number,
  watchedAt: number,
): WatchRecord => ({
  episodeId: `${showId}:${s}:${e}`,
  showId,
  seasonNumber: s,
  episodeNumber: e,
  runtime,
  watchedAt,
  source: 'import',
});

describe('breakdownTime', () => {
  it('splits minutes into days/hours/minutes', () => {
    expect(breakdownTime(60 * 24 + 90)).toEqual({ days: 1, hours: 1, minutes: 30 });
  });
});

describe('computeStats', () => {
  const shows = [show(1, 'A', ['Drama', 'Crime']), show(2, 'B', ['Comedy'])];
  const jan = new Date(2022, 0, 5).getTime();
  const feb = new Date(2022, 1, 5).getTime();
  const watches = [
    watch(1, 1, 1, 50, jan),
    watch(1, 1, 2, 50, jan),
    watch(2, 1, 1, 20, feb),
  ];

  it('totals minutes and episodes', () => {
    const s = computeStats(shows, watches);
    expect(s.totalMinutes).toBe(120);
    expect(s.totalEpisodes).toBe(3);
    expect(s.totalShows).toBe(2);
  });

  it('buckets episodes per month', () => {
    const s = computeStats(shows, watches);
    expect(s.perMonth).toHaveLength(2);
    expect(s.perMonth[0].count).toBe(2); // January
    expect(s.perMonth[1].count).toBe(1); // February
  });

  it('weights top genres by episode count', () => {
    const s = computeStats(shows, watches);
    // Drama & Crime each get 2 (from show A), Comedy gets 1.
    const drama = s.topGenres.find((g) => g.genre === 'Drama');
    expect(drama?.count).toBe(2);
    expect(s.topGenres[0].count).toBe(2);
  });

  it('ranks most-watched shows', () => {
    const s = computeStats(shows, watches);
    expect(s.topShows[0].show.id).toBe(1);
    expect(s.topShows[0].count).toBe(2);
  });
});

describe('computeStats — deeper metrics', () => {
  const DAY = 864e5;
  const dayStart = (offset: number) => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - offset * DAY;
  };

  it('computes current and longest streaks from distinct watched days', () => {
    const shows = [show(1, 'A', [])];
    // Watched today, yesterday, 2 days ago => current streak 3.
    const watches = [
      watch(1, 1, 1, 30, dayStart(0)),
      watch(1, 1, 2, 30, dayStart(1)),
      watch(1, 1, 3, 30, dayStart(2)),
      // An older isolated 2-day run (should not extend current streak).
      watch(1, 1, 4, 30, dayStart(10)),
      watch(1, 1, 5, 30, dayStart(11)),
    ];
    const s = computeStats(shows, watches);
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBe(3);
  });

  it('averages only rated episodes', () => {
    const shows = [show(1, 'A', [])];
    const watches = [
      { ...watch(1, 1, 1, 30, dayStart(0)), rating: 4 },
      { ...watch(1, 1, 2, 30, dayStart(0)), rating: 2 },
      watch(1, 1, 3, 30, dayStart(0)), // unrated — ignored
    ];
    const s = computeStats(shows, watches);
    expect(s.ratedEpisodes).toBe(2);
    expect(s.averageRating).toBe(3);
  });

  it('buckets episodes by weekday and reports completion rate', () => {
    const shows = [
      { ...show(1, 'A', []), status: 'finished' as const },
      { ...show(2, 'B', []), status: 'watching' as const },
    ];
    const watches = [watch(1, 1, 1, 30, dayStart(0)), watch(2, 1, 1, 30, dayStart(0))];
    const s = computeStats(shows, watches);
    expect(s.perWeekday).toHaveLength(7);
    expect(s.perWeekday.reduce((a, d) => a + d.count, 0)).toBe(2);
    // One of two watched shows is finished.
    expect(s.completionRate).toBeCloseTo(0.5);
  });
});

describe('computeBadges', () => {
  it('earns first-steps after one episode and reports progress', () => {
    const stats = computeStats(
      [show(1, 'A', [])],
      [watch(1, 1, 1, 50, Date.now())],
    );
    const badges = computeBadges(stats);
    const first = badges.find((b) => b.key === 'first_steps');
    expect(first?.earned).toBe(true);
    const binger = badges.find((b) => b.key === 'binger');
    expect(binger?.earned).toBe(false);
    expect(binger?.progress).toBeCloseTo(0.01);
  });
});
