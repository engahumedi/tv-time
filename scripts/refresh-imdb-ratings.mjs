#!/usr/bin/env node
/**
 * Refresh the `imdb_ratings` mirror from IMDb's official daily dataset.
 *
 *   https://datasets.imdbws.com/title.ratings.tsv.gz
 *
 * Streams the gzip straight into a line parser (the file is ~9 MB packed /
 * ~26 MB raw, so nothing is ever buffered whole), keeps titles above a vote
 * floor, and upserts them into Supabase through PostgREST in batches.
 *
 * Env:
 *   SUPABASE_URL                Project URL, e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   Service role key (writes bypass RLS)
 *   MIN_VOTES                   Vote floor, default 50
 *   DRY_RUN                     Set to "1" to parse and report without writing
 */

import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';

const DATASET = 'https://datasets.imdbws.com/title.ratings.tsv.gz';
const URL_BASE = process.env.SUPABASE_URL?.replace(/\/$/, '') ?? '';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const MIN_VOTES = Number(process.env.MIN_VOTES ?? 50);
const DRY_RUN = process.env.DRY_RUN === '1';
const BATCH = 5000;

if (!DRY_RUN && (!URL_BASE || !KEY)) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

/** Upsert one batch, retrying on transient failures. */
async function upsert(rows) {
  if (DRY_RUN) return;
  const body = JSON.stringify(rows);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${URL_BASE}/rest/v1/imdb_ratings?on_conflict=tconst`, {
        method: 'POST',
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body,
      });
      if (res.ok) return;
      // 4xx other than rate limiting won't fix itself — fail loudly.
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`${res.status} ${await res.text()}`);
      }
    } catch (err) {
      if (attempt === 4) throw err;
    }
    await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
  }
  throw new Error('upsert failed after retries');
}

async function main() {
  const started = Date.now();
  console.log(`Fetching ${DATASET}`);
  const res = await fetch(DATASET);
  if (!res.ok) throw new Error(`dataset download failed: ${res.status}`);

  const lines = createInterface({
    input: Readable.fromWeb(res.body).pipe(createGunzip()),
    crlfDelay: Infinity,
  });

  let seen = 0;
  let kept = 0;
  let batch = [];
  let first = true;

  for await (const line of lines) {
    if (first) {
      first = false; // header: tconst averageRating numVotes
      continue;
    }
    const [tconst, rating, votes] = line.split('\t');
    if (!tconst) continue;
    seen++;
    const v = Number(votes);
    const r = Number(rating);
    if (!Number.isFinite(v) || v < MIN_VOTES || !Number.isFinite(r)) continue;
    kept++;
    batch.push({ tconst, rating: r, votes: v });
    if (batch.length >= BATCH) {
      await upsert(batch);
      batch = [];
      if (kept % (BATCH * 20) === 0) {
        console.log(`  ${kept.toLocaleString()} upserted…`);
      }
    }
  }
  if (batch.length) await upsert(batch);

  const secs = ((Date.now() - started) / 1000).toFixed(0);
  console.log(
    `${DRY_RUN ? '[dry run] ' : ''}Done: ${kept.toLocaleString()} of ` +
      `${seen.toLocaleString()} titles (votes >= ${MIN_VOTES}) in ${secs}s`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
