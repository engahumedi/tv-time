// Core domain types for ShowTrack

export type ShowStatus =
  | 'not_started'
  | 'watching'
  | 'up_to_date'
  | 'finished'
  | 'stopped';

/** A TV show that lives in the user's library (sourced from TMDB or demo data). */
export interface Show {
  /** TMDB id (or a negative synthetic id for demo shows). Primary key. */
  id: number;
  name: string;
  originalName?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  firstAirDate: string | null;
  genres: string[];
  /** Total number of episodes across all seasons, when known. */
  numberOfEpisodes?: number;
  numberOfSeasons?: number;
  /** Default runtime in minutes, used as a fallback for episodes with unknown runtime. */
  episodeRuntime: number;
  /** User-controlled status. */
  status: ShowStatus;
  /** When the show was added to the library. */
  addedAt: number;
}

/** A single episode belonging to a show. */
export interface Episode {
  /** `${showId}:${season}:${number}` — stable composite id. Primary key. */
  id: string;
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview?: string;
  airDate: string | null;
  /** Runtime in minutes. Falls back to the show default when unknown. */
  runtime: number | null;
  stillPath?: string | null;
}

/** A record that the user watched a given episode. Dedup key is `episodeId`. */
export interface WatchRecord {
  /** Same as the episode composite id — guarantees no duplicate watches. Primary key. */
  episodeId: string;
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  /** Epoch ms of when the episode was watched (preserved from imports). */
  watchedAt: number;
  /** Runtime in minutes captured at watch time, so stats stay stable. */
  runtime: number;
  /** Where this record came from. */
  source: 'manual' | 'import';
}

export type Language = 'en' | 'ar';

/** A row of raw watch data parsed out of a TV Time export, before matching. */
export interface ParsedWatch {
  seriesName: string;
  /** Any id present in the export (TMDB / TheTVDB / TV Time internal). */
  seriesExternalId?: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeName?: string;
  watchedAt: number | null;
  /** The raw source filename this row came from (for diagnostics). */
  sourceFile: string;
}

/** Grouping of parsed watches by series name, produced during import preview. */
export interface ParsedShowGroup {
  seriesName: string;
  seriesExternalId?: string;
  episodeCount: number;
  watches: ParsedWatch[];
  /** Result of automatic matching, filled in during the match phase. */
  match?: Show | null;
  /** True once the user has resolved this group (auto or manual). */
  resolved: boolean;
}

export interface ImportSummary {
  showsMatched: number;
  showsUnmatched: number;
  episodesImported: number;
  duplicatesSkipped: number;
  totalMinutes: number;
}
