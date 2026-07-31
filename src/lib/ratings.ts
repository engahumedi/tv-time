import { getExternalRatings, hasOmdbKey, type ExternalRatings } from './omdb';
import { getImdbIdFor } from './tmdb';

/**
 * Ratings for a title identified by its TMDB id (what cards and lists have).
 *
 * TMDB's list endpoints don't include an IMDb id, so this resolves it from the
 * detail endpoint first and then asks OMDb. Both hops are cached by the edge
 * proxy for 24h, and results (including "no rating") are cached here for a week
 * so scrolling a grid twice costs nothing.
 */

const TTL = 7 * 864e5; // a week
const STORE_PREFIX = 'st:rt:';

interface Cached {
  t: number;
  v: ExternalRatings | null;
}

const memory = new Map<string, ExternalRatings | null>();

function read(key: string): Cached | undefined {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.t > TTL) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function write(key: string, v: ExternalRatings | null): void {
  memory.set(key, v);
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* quota / private mode — the in-memory cache still helps */
  }
}

// Only a few look-ups in flight at once: a Discover grid can hold 60+ cards and
// we don't want to fire hundreds of requests the moment it renders.
const MAX_INFLIGHT = 4;
let inflight = 0;
const queue: (() => void)[] = [];

function acquire(): Promise<void> {
  if (inflight < MAX_INFLIGHT) {
    inflight++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function release(): void {
  const next = queue.shift();
  if (next) next();
  else inflight--;
}

/** Ratings for a TMDB title. Returns null when nothing is available. */
export async function getRatingsForTmdb(
  kind: 'tv' | 'movie',
  tmdbId: number,
): Promise<ExternalRatings | null> {
  if (!hasOmdbKey || !tmdbId || tmdbId < 0) return null;
  const key = `${kind}:${tmdbId}`;
  if (memory.has(key)) return memory.get(key)!;
  const cached = read(key);
  if (cached) {
    memory.set(key, cached.v);
    return cached.v;
  }

  await acquire();
  try {
    const imdbId = await getImdbIdFor(kind, tmdbId);
    const value = imdbId ? await getExternalRatings(imdbId) : null;
    write(key, value);
    return value;
  } catch {
    write(key, null); // negative-cache so a broken title isn't retried forever
    return null;
  } finally {
    release();
  }
}
