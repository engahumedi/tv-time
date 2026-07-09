import { describe, it, expect } from 'vitest';
import { parseCsv, groupBySeries, parseMoviesCsv, groupMovies } from './importParser';

describe('parseCsv — format auto-detection', () => {
  it('parses the older seen_episode layout', () => {
    const csv = [
      'series_name,season_number,episode_number,episode_name,created_at',
      'Breaking Bad,1,1,Pilot,2019-03-04 21:15:00',
      'Breaking Bad,1,2,Cat in the Bag...,2019-03-05 20:00:00',
    ].join('\n');
    const rows = parseCsv(csv, 'seen_episode.csv');
    expect(rows).toHaveLength(2);
    expect(rows[0].seriesName).toBe('Breaking Bad');
    expect(rows[0].seasonNumber).toBe(1);
    expect(rows[0].episodeNumber).toBe(1);
    expect(rows[0].watchedAt).not.toBeNull();
  });

  it('parses a newer layout with different column names', () => {
    const csv = [
      'show_name,season,episode,watched_at,tmdb_id',
      'Stranger Things,2,4,2021-06-01T10:00:00Z,66732',
    ].join('\n');
    const rows = parseCsv(csv, 'tracking-prod-records-v2.csv');
    expect(rows).toHaveLength(1);
    expect(rows[0].seriesName).toBe('Stranger Things');
    expect(rows[0].seriesExternalId).toBe('66732');
    expect(rows[0].seasonNumber).toBe(2);
    expect(rows[0].episodeNumber).toBe(4);
  });

  it('parses an SxxExx episode label when season/episode columns are absent', () => {
    const csv = ['series,code,timestamp', 'The Office,S03E12,1622548800'].join(
      '\n',
    );
    const rows = parseCsv(csv, 'export.csv');
    expect(rows).toHaveLength(1);
    expect(rows[0].seasonNumber).toBe(3);
    expect(rows[0].episodeNumber).toBe(12);
    // unix seconds -> ms
    expect(rows[0].watchedAt).toBe(1622548800 * 1000);
  });

  it('returns nothing for a file with no watch columns (e.g. profile.csv)', () => {
    const csv = ['username,email,joined', 'me,me@example.com,2018'].join('\n');
    expect(parseCsv(csv, 'profile.csv')).toHaveLength(0);
  });

  it('skips rows that lack any series identity', () => {
    const csv = ['series_name,episode_number', ',5', 'Chernobyl,1'].join('\n');
    const rows = parseCsv(csv, 'x.csv');
    expect(rows).toHaveLength(1);
    expect(rows[0].seriesName).toBe('Chernobyl');
  });
});

describe('parseMoviesCsv — movie detection', () => {
  it('parses a movie file identified by a movie_name column', () => {
    const csv = [
      'movie_name,tmdb_id,watched_at',
      'Fight Club,550,2020-05-01',
      'Inception,27205,2021-07-10',
    ].join('\n');
    const rows = parseMoviesCsv(csv, 'movies.csv');
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe('Fight Club');
    expect(rows[0].externalId).toBe('550');
  });

  it('parses a generic-title movie file identified by the filename hint', () => {
    const csv = ['title,watched_at', 'The Matrix,2019-02-02'].join('\n');
    const rows = parseMoviesCsv(csv, 'tracking-prod-records-movie.csv');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('The Matrix');
  });

  it('does NOT treat a series file as movies', () => {
    const csv = [
      'series_name,season_number,episode_number,created_at',
      'Breaking Bad,1,1,2019-03-04',
    ].join('\n');
    expect(parseMoviesCsv(csv, 'seen_episode.csv')).toHaveLength(0);
  });

  it('does NOT treat a generic title file without a movie signal as movies', () => {
    const csv = ['title,added', 'Some Watchlist Show,2020'].join('\n');
    expect(parseMoviesCsv(csv, 'watchlist.csv')).toHaveLength(0);
  });
});

describe('groupMovies', () => {
  it('de-duplicates by id and keeps the earliest watch date', () => {
    const csv = [
      'movie_name,movie_id,watched_at',
      'Dune,438631,2022-01-01',
      'Dune,438631,2021-06-01',
    ].join('\n');
    const groups = groupMovies(parseMoviesCsv(csv, 'movies.csv'));
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Dune');
    expect(groups[0].watchedAt).toBe(new Date('2021-06-01').getTime());
  });
});

describe('groupBySeries', () => {
  it('groups rows and counts distinct episodes (ignoring re-watches)', () => {
    const csv = [
      'series_name,season_number,episode_number,created_at',
      'Friends,1,1,2020-01-01',
      'Friends,1,1,2021-01-01', // re-watch of same episode
      'Friends,1,2,2020-01-02',
    ].join('\n');
    const groups = groupBySeries(parseCsv(csv, 'x.csv'));
    expect(groups).toHaveLength(1);
    expect(groups[0].seriesName).toBe('Friends');
    expect(groups[0].episodeCount).toBe(2); // distinct episodes
    expect(groups[0].watches).toHaveLength(3);
  });
});
