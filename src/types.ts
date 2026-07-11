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
  /** TMDB community rating, 0–10 (undefined when unknown). */
  voteAverage?: number;
  /** IMDb id (e.g. "tt0903747"), used to look up the IMDb rating via OMDb. */
  imdbId?: string;
  /** The user's own rating for the show, 1–10 (undefined when unrated). */
  userRating?: number;
  /** Free-form tags the user attached to the show. */
  tags?: string[];
  /** Marked as a favourite (shown on the profile). */
  favorite?: boolean;
  /** User-controlled status. */
  status: ShowStatus;
  /** When the show was added to the library. */
  addedAt: number;
}

/** A movie in the user's library (sourced from TMDB). Tracked as a single watch. */
export interface Movie {
  /** TMDB movie id. Primary key. */
  id: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  genres: string[];
  /** Runtime in minutes (0 when unknown). */
  runtime: number;
  voteAverage?: number;
  imdbId?: string;
  /** The user's own rating, 1–10 (undefined when unrated). */
  userRating?: number;
  favorite?: boolean;
  /** Whether the user has watched it. */
  watched: boolean;
  /** On the "want to watch" list (a movie can be queued before it's watched). */
  watchlist?: boolean;
  /** Epoch ms of when it was watched (undefined until watched). */
  watchedAt?: number;
  /** When the movie was added to the library. */
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
  /** The user's rating for this episode, 1–5 stars (undefined when unrated). */
  rating?: number;
  /** A personal note the user wrote about this episode. */
  note?: string;
  /** Where this record came from. */
  source: 'manual' | 'import';
  /** How many times this episode was watched (re-watches). Absent = 1. */
  plays?: number;
}

/**
 * A user-created collection (e.g. "Anime", "Comfort watches"). A list holds
 * either shows or movies — never both — determined by `kind`. `showIds` stores
 * the item ids regardless of kind (they are TMDB ids). Older lists without a
 * `kind` are treated as show lists.
 */
export interface ShowList {
  id: string;
  name: string;
  showIds: number[];
  createdAt: number;
  kind?: 'show' | 'movie';
}

export type Language = 'en' | 'ar';

/** A public-facing user profile (for search / friend viewing). */
export interface Profile {
  id: string;
  username: string;
  displayName: string;
  isPublic: boolean;
  avatarUrl?: string | null;
}

/** A row of raw watch data parsed out of a TV Time export, before matching. */
export interface ParsedWatch {
  seriesName: string;
  /** Any id present in the export (TMDB / TheTVDB / TV Time internal). */
  seriesExternalId?: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeName?: string;
  watchedAt: number | null;
  /** Explicit watch/re-watch count from the export, when a column provides it. */
  plays?: number | null;
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

/** A raw movie row parsed out of a TV Time export, before matching. */
export interface ParsedMovie {
  title: string;
  /** Any id present in the export (TMDB / IMDb). */
  externalId?: string;
  watchedAt: number | null;
  sourceFile: string;
}

/** A de-duplicated movie awaiting a TMDB match during import. */
export interface ParsedMovieGroup {
  title: string;
  externalId?: string;
  watchedAt: number | null;
  match?: Movie | null;
  resolved: boolean;
}

export interface ImportSummary {
  showsMatched: number;
  showsUnmatched: number;
  episodesImported: number;
  duplicatesSkipped: number;
  totalMinutes: number;
  moviesMatched: number;
  moviesImported: number;
}
