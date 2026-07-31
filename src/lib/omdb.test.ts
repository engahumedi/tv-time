import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Parsing tests for the OMDb ratings payload. These lock in the shapes seen
 * from the real API: movies usually carry IMDb + Metacritic and sometimes a
 * tomatometer; TV series usually carry IMDb only.
 */

const FORD_V_FERRARI = {
  Response: 'True',
  imdbRating: '8.1',
  imdbVotes: '431,000',
  Metascore: '81',
  Ratings: [
    { Source: 'Internet Movie Database', Value: '8.1/10' },
    { Source: 'Rotten Tomatoes', Value: '92%' },
    { Source: 'Metacritic', Value: '81/100' },
  ],
};

const THE_ROOKIE = {
  Response: 'True',
  imdbRating: '8.0',
  imdbVotes: '60,000',
  Metascore: 'N/A',
  Ratings: [{ Source: 'Internet Movie Database', Value: '8.0/10' }],
};

const UNRATED = {
  Response: 'True',
  imdbRating: 'N/A',
  imdbVotes: 'N/A',
  Metascore: 'N/A',
  Ratings: [],
};

const NOT_FOUND = { Response: 'False', Error: 'Incorrect IMDb ID.' };

function mockOmdb(payload: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => payload }) as unknown as Response),
  );
}

async function load() {
  // Fresh module each time so the in-module caches don't leak between cases.
  vi.resetModules();
  return import('./omdb');
}

describe('getExternalRatings', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_OMDB_API_KEY', 'test-key');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('pulls IMDb, Rotten Tomatoes and Metacritic from a movie payload', async () => {
    mockOmdb(FORD_V_FERRARI);
    const { getExternalRatings } = await load();
    const r = await getExternalRatings('tt1950186');
    expect(r?.imdb?.rating).toBe('8.1');
    expect(r?.rottenTomatoes).toBe(92);
    expect(r?.metacritic).toBe(81);
  });

  it('returns IMDb only when a series has no tomatometer or Metascore', async () => {
    mockOmdb(THE_ROOKIE);
    const { getExternalRatings } = await load();
    const r = await getExternalRatings('tt7587890');
    expect(r?.imdb?.rating).toBe('8.0');
    // Badges hide on null rather than rendering a bogus 0.
    expect(r?.rottenTomatoes).toBeNull();
    expect(r?.metacritic).toBeNull();
  });

  it('treats "N/A" values as missing', async () => {
    mockOmdb(UNRATED);
    const { getExternalRatings } = await load();
    const r = await getExternalRatings('tt0000000');
    expect(r?.imdb).toBeNull();
    expect(r?.rottenTomatoes).toBeNull();
    expect(r?.metacritic).toBeNull();
  });

  it('returns null for an unknown title', async () => {
    mockOmdb(NOT_FOUND);
    const { getExternalRatings } = await load();
    expect(await getExternalRatings('tt9999999')).toBeNull();
  });

  it('returns null without an imdb id and makes no request', async () => {
    mockOmdb(FORD_V_FERRARI);
    const { getExternalRatings } = await load();
    expect(await getExternalRatings(undefined)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('caches by imdb id so a repeated look-up costs nothing', async () => {
    mockOmdb(FORD_V_FERRARI);
    const { getExternalRatings } = await load();
    await getExternalRatings('tt1950186');
    await getExternalRatings('tt1950186');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('survives a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { getExternalRatings } = await load();
    expect(await getExternalRatings('tt1950186')).toBeNull();
  });
});
