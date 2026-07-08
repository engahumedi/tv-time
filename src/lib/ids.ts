// Helpers for building the stable composite ids used across the app.

export function episodeId(showId: number, season: number, episode: number): string {
  return `${showId}:${season}:${episode}`;
}

export function parseEpisodeId(id: string): {
  showId: number;
  season: number;
  episode: number;
} {
  const [showId, season, episode] = id.split(':').map(Number);
  return { showId, season, episode };
}
