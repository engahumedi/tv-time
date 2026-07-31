// Edge Function: proxies TMDB and OMDb so their API keys stay server-side and
// never reach the browser. Deployed at /functions/v1/api.
//
//   GET /functions/v1/api/tmdb/search/tv?query=...   -> TMDB
//   GET /functions/v1/api/omdb?i=tt0903747           -> OMDb
//
// Keys are read from function secrets (TMDB_API_KEY, OMDB_API_KEY).
//
// Caching: successful browse/detail lookups are cached both at the edge (Deno
// Cache API — shared across users, cuts upstream TMDB calls) and by the browser
// (Cache-Control — cuts repeat invocations). Volatile searches use a short
// browser TTL only, and errors are never cached.

const TMDB_KEY = Deno.env.get('TMDB_API_KEY') ?? '';
const OMDB_KEY = Deno.env.get('OMDB_API_KEY') ?? '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const OMDB_BASE = 'https://www.omdbapi.com/';
// Auto-injected into every Supabase Edge Function.
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
};

/**
 * Permanently delete the calling user's account. The bearer token must be the
 * user's own access token; we verify it, then use the service role to remove
 * the auth user (which cascades to all their rows via ON DELETE CASCADE).
 */
async function deleteAccount(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || !SB_URL || !SB_SERVICE) return json(401, { error: 'unauthorized' });

  // Resolve the user id from their token.
  const who = await fetch(`${SB_URL}/auth/v1/user`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` },
  });
  if (!who.ok) return json(401, { error: 'unauthorized' });
  const user = await who.json();
  if (!user?.id) return json(401, { error: 'unauthorized' });

  const del = await fetch(`${SB_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}` },
  });
  if (!del.ok) return json(502, { error: 'delete_failed' });
  return json(200, { ok: true });
}

// ---------------------------------------------------------------------------
// IMDb ratings (batch)
//
//   GET /functions/v1/api/ratings?tv=1396,94997&movie=550
//   -> { "tv:1396": 9.5, "movie:550": 8.8 }
//
// Ratings come from IMDb's official daily dataset, mirrored into the
// `imdb_ratings` table — full coverage, no third-party rate limit, and one
// request serves a whole poster grid. TMDB list endpoints don't return an IMDb
// id, so the tmdb -> imdb mapping is resolved once and cached in `tmdb_imdb`
// for every user after that.
// ---------------------------------------------------------------------------

const MAX_IDS = 120;

function sbHeaders(): Record<string, string> {
  return {
    apikey: SB_SERVICE,
    Authorization: `Bearer ${SB_SERVICE}`,
    'content-type': 'application/json',
  };
}

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  const out: number[] = [];
  for (const part of raw.split(',')) {
    const n = Number(part.trim());
    if (Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n);
    if (out.length >= MAX_IDS) break;
  }
  return out;
}

/** Look up cached tmdb -> imdb mappings for one kind. */
async function knownMappings(
  kind: 'tv' | 'movie',
  ids: number[],
): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>();
  if (ids.length === 0) return map;
  const url = `${SB_URL}/rest/v1/tmdb_imdb?select=tmdb_id,imdb_id&kind=eq.${kind}&tmdb_id=in.(${ids.join(',')})`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) return map;
  for (const r of (await res.json()) as { tmdb_id: number; imdb_id: string | null }[]) {
    map.set(r.tmdb_id, r.imdb_id);
  }
  return map;
}

/** Ask TMDB for a title's IMDb id (only for ids we haven't mapped yet). */
async function resolveImdbId(kind: 'tv' | 'movie', id: number): Promise<string | null> {
  try {
    const path = kind === 'movie' ? `/movie/${id}` : `/tv/${id}/external_ids`;
    const u = new URL(TMDB_BASE + path);
    u.searchParams.set('api_key', TMDB_KEY);
    const r = await fetch(u.toString());
    if (!r.ok) return null;
    const d = (await r.json()) as { imdb_id?: string | null };
    return d.imdb_id || null;
  } catch {
    return null;
  }
}

/** Resolve missing mappings (bounded concurrency) and persist them. */
async function fillMappings(
  kind: 'tv' | 'movie',
  missing: number[],
  into: Map<number, string | null>,
): Promise<void> {
  if (missing.length === 0) return;
  const CONCURRENCY = 12;
  let cursor = 0;
  const rows: { kind: string; tmdb_id: number; imdb_id: string | null }[] = [];
  async function worker() {
    while (cursor < missing.length) {
      const id = missing[cursor++];
      const imdbId = await resolveImdbId(kind, id);
      into.set(id, imdbId);
      rows.push({ kind, tmdb_id: id, imdb_id: imdbId });
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, missing.length) }, worker),
  );
  if (rows.length) {
    // Cache the mapping (including "no imdb id") so nobody re-resolves it.
    await fetch(`${SB_URL}/rest/v1/tmdb_imdb?on_conflict=kind,tmdb_id`, {
      method: 'POST',
      headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    }).catch(() => {});
  }
}

async function ratingsHandler(url: URL): Promise<Response> {
  if (!SB_URL || !SB_SERVICE) return json(503, { error: 'unavailable' });
  const tv = parseIds(url.searchParams.get('tv'));
  const movie = parseIds(url.searchParams.get('movie'));
  if (tv.length === 0 && movie.length === 0) return json(200, {});

  const [tvMap, movieMap] = await Promise.all([
    knownMappings('tv', tv),
    knownMappings('movie', movie),
  ]);
  await Promise.all([
    fillMappings('tv', tv.filter((i) => !tvMap.has(i)), tvMap),
    fillMappings('movie', movie.filter((i) => !movieMap.has(i)), movieMap),
  ]);

  // One lookup for every resolved IMDb id.
  const tconsts = [...tvMap.values(), ...movieMap.values()].filter(Boolean) as string[];
  const byTconst = new Map<string, number>();
  if (tconsts.length) {
    const q = `${SB_URL}/rest/v1/imdb_ratings?select=tconst,rating&tconst=in.(${tconsts.join(',')})`;
    const r = await fetch(q, { headers: sbHeaders() });
    if (r.ok) {
      for (const row of (await r.json()) as { tconst: string; rating: string }[]) {
        byTconst.set(row.tconst, Number(row.rating));
      }
    }
  }

  const out: Record<string, number> = {};
  for (const [kind, map] of [['tv', tvMap], ['movie', movieMap]] as const) {
    for (const [id, tconst] of map) {
      const rating = tconst ? byTconst.get(tconst) : undefined;
      if (rating !== undefined) out[`${kind}:${id}`] = rating;
    }
  }
  return new Response(JSON.stringify(out), {
    headers: {
      ...CORS,
      'content-type': 'application/json',
      // Ratings drift slowly; a few hours of caching is plenty.
      'cache-control': 'public, max-age=21600, s-maxage=21600, stale-while-revalidate=604800',
    },
  });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const params = url.searchParams;

    if (path.endsWith('/account') && req.method === 'DELETE') {
      return await deleteAccount(req);
    }

    if (path.endsWith('/ratings')) {
      return await ratingsHandler(url);
    }

    let target: URL;
    let isSearch = false;
    const tmdbAt = path.indexOf('/tmdb');
    const omdbAt = path.indexOf('/omdb');

    if (tmdbAt >= 0) {
      const sub = path.slice(tmdbAt + '/tmdb'.length) || '/'; // e.g. "/search/tv"
      isSearch = sub.includes('/search/'); // search results change — cache briefly
      target = new URL(TMDB_BASE + sub);
      for (const [k, v] of params) target.searchParams.set(k, v);
      target.searchParams.set('api_key', TMDB_KEY);
    } else if (omdbAt >= 0) {
      target = new URL(OMDB_BASE);
      for (const [k, v] of params) target.searchParams.set(k, v);
      target.searchParams.set('apikey', OMDB_KEY);
    } else {
      return json(404, { error: 'unknown_provider' });
    }

    // Edge cache: keyed by the incoming URL (no api_key, so no secret leaks).
    // Only stable (non-search) lookups are shared across users.
    const cacheable = !isSearch;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    let cache: Cache | undefined;
    if (cacheable) {
      try {
        cache = await caches.open('proxy-v1');
        const hit = await cache.match(cacheKey);
        if (hit) return hit;
      } catch {
        cache = undefined; // Cache API unavailable — fall back to a live fetch.
      }
    }

    const upstream = await fetch(target.toString());
    const bodyText = await upstream.text();
    const ok = upstream.ok;
    const maxAge = isSearch ? 300 : 86400; // 5 min for search, 24h otherwise

    const res = new Response(bodyText, {
      status: upstream.status,
      headers: {
        ...CORS,
        'content-type':
          upstream.headers.get('content-type') ?? 'application/json',
        // Never cache failures; cache successes at browser + shared caches.
        'cache-control': ok
          ? `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=604800`
          : 'no-store',
      },
    });

    if (ok && cacheable && cache) {
      try {
        await cache.put(cacheKey, res.clone());
      } catch {
        /* best-effort edge cache */
      }
    }
    return res;
  } catch (_e) {
    return json(502, { error: 'proxy_error' });
  }
});
