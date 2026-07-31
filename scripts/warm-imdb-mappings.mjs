#!/usr/bin/env node
/**
 * Pre-resolve TMDB -> IMDb id mappings for the titles people actually browse.
 *
 * TMDB's list endpoints don't return an IMDb id, so the first person to scroll
 * past a poster pays a lookup before its rating can appear (measured: ~3.1s for
 * a cold grid of 20 vs ~0.8s once mapped). Walking the popular/trending lists
 * ahead of time keeps that cost off the critical path.
 *
 * Env:
 *   SUPABASE_URL                Project URL
 *   SUPABASE_SERVICE_ROLE_KEY   Service role key (writes bypass RLS)
 *   TMDB_PROXY                  Edge-function base, e.g. https://x.supabase.co/functions/v1/api
 *   WARM_PAGES                  Pages per list, default 10 (20 titles each)
 */

const URL_BASE = process.env.SUPABASE_URL?.replace(/\/$/, '') ?? '';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PROXY = process.env.TMDB_PROXY?.replace(/\/$/, '') ?? '';
const PAGES = Number(process.env.WARM_PAGES ?? 10);
const CONCURRENCY = 8;

if (!URL_BASE || !KEY || !PROXY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or TMDB_PROXY.');
  process.exit(1);
}

const sb = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2 ** i * 500));
  }
  return null;
}

/** Collect candidate TMDB ids from the lists the app actually shows. */
async function collect(kind) {
  const paths =
    kind === 'tv'
      ? ['/trending/tv/week', '/tv/top_rated', '/discover/tv?sort_by=popularity.desc']
      : ['/trending/movie/week', '/movie/top_rated', '/discover/movie?sort_by=popularity.desc'];
  const ids = new Set();
  for (const p of paths) {
    for (let page = 1; page <= PAGES; page++) {
      const sep = p.includes('?') ? '&' : '?';
      const d = await getJson(`${PROXY}/tmdb${p}${sep}page=${page}`);
      for (const r of d?.results ?? []) if (r.id) ids.add(r.id);
    }
  }
  return [...ids];
}

/** Which of these are already mapped? (chunked to keep URLs sane) */
async function alreadyMapped(kind, ids) {
  const known = new Set();
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const url = `${URL_BASE}/rest/v1/tmdb_imdb?select=tmdb_id&kind=eq.${kind}&tmdb_id=in.(${chunk.join(',')})`;
    const r = await fetch(url, { headers: sb });
    if (!r.ok) continue;
    for (const row of await r.json()) known.add(row.tmdb_id);
  }
  return known;
}

async function resolveImdbId(kind, id) {
  const path = kind === 'movie' ? `/movie/${id}` : `/tv/${id}/external_ids`;
  const d = await getJson(`${PROXY}/tmdb${path}`);
  return d?.imdb_id || null;
}

async function warm(kind) {
  const ids = await collect(kind);
  const known = await alreadyMapped(kind, ids);
  const todo = ids.filter((i) => !known.has(i));
  console.log(`${kind}: ${ids.length} candidates, ${known.size} already mapped, ${todo.length} to resolve`);
  if (todo.length === 0) return 0;

  const rows = [];
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const id = todo[cursor++];
      rows.push({ kind, tmdb_id: id, imdb_id: await resolveImdbId(kind, id) });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));

  for (let i = 0; i < rows.length; i += 500) {
    const res = await fetch(`${URL_BASE}/rest/v1/tmdb_imdb?on_conflict=kind,tmdb_id`, {
      method: 'POST',
      headers: { ...sb, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 500)),
    });
    if (!res.ok) throw new Error(`upsert failed: ${res.status} ${await res.text()}`);
  }
  return rows.length;
}

const started = Date.now();
const tv = await warm('tv');
const movie = await warm('movie');
console.log(
  `Warmed ${tv + movie} new mappings (tv ${tv}, movie ${movie}) in ${((Date.now() - started) / 1000).toFixed(0)}s`,
);
