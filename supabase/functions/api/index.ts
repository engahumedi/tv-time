// Edge Function: proxies TMDB and OMDb so their API keys stay server-side and
// never reach the browser. Deployed at /functions/v1/api.
//
//   GET /functions/v1/api/tmdb/search/tv?query=...   -> TMDB
//   GET /functions/v1/api/omdb?i=tt0903747           -> OMDb
//
// Keys are read from function secrets (TMDB_API_KEY, OMDB_API_KEY).

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
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const params = url.searchParams;

    let target: URL;
    const tmdbAt = path.indexOf('/tmdb');
    const omdbAt = path.indexOf('/omdb');

    if (tmdbAt >= 0) {
      const sub = path.slice(tmdbAt + '/tmdb'.length) || '/'; // e.g. "/search/tv"
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

    const upstream = await fetch(target.toString());
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...CORS,
        'content-type':
          upstream.headers.get('content-type') ?? 'application/json',
        // Let the browser/CDN cache identical lookups briefly.
        'cache-control': 'public, max-age=3600',
      },
    });
  } catch (_e) {
    return json(502, { error: 'proxy_error' });
  }
});
