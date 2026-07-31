import { functionsBase, supabaseAnonKey } from './supabase';

/**
 * IMDb ratings for poster cards.
 *
 * Ratings come from IMDb's official daily dataset mirrored into our own table,
 * served by the `/api/ratings` edge endpoint. Requests made in the same tick are
 * coalesced into one batch, so a grid of 60 posters costs a single round trip
 * instead of two requests per card. Answers (including "no rating") are cached
 * in memory and in localStorage for a day.
 */

const PROXY = functionsBase();
export const hasRatingsSource = Boolean(PROXY);

const TTL = 864e5; // a day — the dataset refreshes daily
const STORE_PREFIX = 'st:imdb:';
/** Keep the query string well inside any URL limit. */
const MAX_BATCH = 100;
/** Wait this long to gather ids before firing a batch. */
const BATCH_MS = 60;

const memory = new Map<string, number | null>();

function readStored(key: string): number | null | undefined {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    if (!raw) return undefined;
    const { t, v } = JSON.parse(raw) as { t: number; v: number | null };
    if (Date.now() - t > TTL) return undefined;
    return v;
  } catch {
    return undefined;
  }
}

function store(key: string, v: number | null): void {
  memory.set(key, v);
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* quota / private mode — memory cache still applies */
  }
}

type Pending = { key: string; resolve: (v: number | null) => void };

let queue: Pending[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush(): Promise<void> {
  timer = null;
  const batch = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  if (queue.length > 0) schedule(); // more waiting — keep draining
  if (batch.length === 0) return;

  const tv: number[] = [];
  const movie: number[] = [];
  for (const p of batch) {
    const [kind, id] = p.key.split(':');
    (kind === 'movie' ? movie : tv).push(Number(id));
  }

  let data: Record<string, number> = {};
  try {
    const qs = new URLSearchParams();
    if (tv.length) qs.set('tv', tv.join(','));
    if (movie.length) qs.set('movie', movie.join(','));
    const headers: Record<string, string> = {};
    if (supabaseAnonKey) {
      headers.apikey = supabaseAnonKey;
      headers.Authorization = `Bearer ${supabaseAnonKey}`;
    }
    const res = await fetch(`${PROXY}/api/ratings?${qs}`, { headers });
    if (res.ok) data = (await res.json()) as Record<string, number>;
  } catch {
    /* offline — resolve everyone as unknown below */
  }

  for (const p of batch) {
    const v = typeof data[p.key] === 'number' ? data[p.key] : null;
    store(p.key, v);
    p.resolve(v);
  }
}

function schedule(): void {
  if (timer === null) timer = setTimeout(flush, BATCH_MS);
}

/**
 * The IMDb rating for a TMDB title, or null when IMDb has none.
 * Safe to call for every visible card — calls are batched and cached.
 */
export function getImdbRatingForTmdb(
  kind: 'tv' | 'movie',
  tmdbId: number,
): Promise<number | null> {
  if (!hasRatingsSource || !tmdbId || tmdbId < 0) return Promise.resolve(null);
  const key = `${kind}:${tmdbId}`;
  if (memory.has(key)) return Promise.resolve(memory.get(key)!);
  const stored = readStored(key);
  if (stored !== undefined) {
    memory.set(key, stored);
    return Promise.resolve(stored);
  }
  return new Promise((resolve) => {
    queue.push({ key, resolve });
    if (queue.length >= MAX_BATCH && timer !== null) {
      clearTimeout(timer);
      timer = null;
      void flush();
    } else {
      schedule();
    }
  });
}
