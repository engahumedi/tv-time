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
