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

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

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
