import { getAllShows, getAllWatches } from './repo';
import { db } from './db';

/**
 * Export the user's entire library as a single JSON file they can keep or
 * re-import. Round-trips shows, episodes and watch history.
 */
export async function exportData(): Promise<Blob> {
  const [shows, watches, episodes] = await Promise.all([
    getAllShows(),
    getAllWatches(),
    db.episodes.toArray(),
  ]);
  const payload = {
    app: 'showtrack',
    version: 1,
    exportedAt: new Date().toISOString(),
    shows,
    episodes,
    watches,
  };
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
}

/** Also offer a flat CSV of watch history, matching TV Time's own format. */
export async function exportWatchesCsv(): Promise<Blob> {
  const [shows, watches] = await Promise.all([getAllShows(), getAllWatches()]);
  const showName = new Map(shows.map((s) => [s.id, s.name]));
  const header = 'series_name,season_number,episode_number,watched_at,runtime_minutes';
  const rows = watches
    .sort((a, b) => a.watchedAt - b.watchedAt)
    .map((w) =>
      [
        csvCell(showName.get(w.showId) ?? String(w.showId)),
        w.seasonNumber,
        w.episodeNumber,
        new Date(w.watchedAt).toISOString(),
        w.runtime,
      ].join(','),
    );
  return new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
