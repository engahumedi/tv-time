import type { Show, Episode } from '../types';
import { episodeId } from './ids';

/**
 * A small bundled library so the whole app is explorable without a TMDB key.
 * Posters/backdrops use TMDB's public image CDN paths (no key needed to load
 * images), so demo shows still look real. When a real key is present these are
 * ignored in favour of live search results.
 */

interface DemoShowSeed {
  id: number;
  name: string;
  originalName?: string;
  overview: string;
  posterPath: string;
  backdropPath: string;
  firstAirDate: string;
  genres: string[];
  episodeRuntime: number;
  seasons: { season: number; episodes: number; year: number; runtime: number }[];
}

const SEEDS: DemoShowSeed[] = [
  {
    id: -1,
    name: 'Breaking Bad',
    overview:
      'A high-school chemistry teacher diagnosed with cancer turns to cooking crystal meth to secure his family’s future, and is pulled ever deeper into the drug trade.',
    posterPath: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    backdropPath: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    firstAirDate: '2008-01-20',
    genres: ['Drama', 'Crime'],
    episodeRuntime: 47,
    seasons: [
      { season: 1, episodes: 7, year: 2008, runtime: 48 },
      { season: 2, episodes: 13, year: 2009, runtime: 47 },
      { season: 3, episodes: 13, year: 2010, runtime: 47 },
      { season: 4, episodes: 13, year: 2011, runtime: 47 },
      { season: 5, episodes: 16, year: 2012, runtime: 47 },
    ],
  },
  {
    id: -2,
    name: 'Stranger Things',
    overview:
      'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    posterPath: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdropPath: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    firstAirDate: '2016-07-15',
    genres: ['Drama', 'Sci-Fi & Fantasy', 'Mystery'],
    episodeRuntime: 51,
    seasons: [
      { season: 1, episodes: 8, year: 2016, runtime: 48 },
      { season: 2, episodes: 9, year: 2017, runtime: 52 },
      { season: 3, episodes: 8, year: 2019, runtime: 55 },
      { season: 4, episodes: 9, year: 2022, runtime: 75 },
    ],
  },
  {
    id: -3,
    name: 'The Office',
    overview:
      'A mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behaviour, and tedium.',
    posterPath: '/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg',
    backdropPath: '/mLyW3UTgi2lsMdtueYODcfAB9Ku.jpg',
    firstAirDate: '2005-03-24',
    genres: ['Comedy'],
    episodeRuntime: 22,
    seasons: [
      { season: 1, episodes: 6, year: 2005, runtime: 23 },
      { season: 2, episodes: 22, year: 2005, runtime: 22 },
      { season: 3, episodes: 25, year: 2006, runtime: 22 },
      { season: 4, episodes: 19, year: 2007, runtime: 22 },
      { season: 5, episodes: 28, year: 2008, runtime: 22 },
    ],
  },
  {
    id: -4,
    name: 'Game of Thrones',
    overview:
      'Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.',
    posterPath: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
    backdropPath: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
    firstAirDate: '2011-04-17',
    genres: ['Sci-Fi & Fantasy', 'Drama', 'Action & Adventure'],
    episodeRuntime: 60,
    seasons: [
      { season: 1, episodes: 10, year: 2011, runtime: 62 },
      { season: 2, episodes: 10, year: 2012, runtime: 55 },
      { season: 3, episodes: 10, year: 2013, runtime: 56 },
      { season: 4, episodes: 10, year: 2014, runtime: 57 },
    ],
  },
  {
    id: -5,
    name: 'The Mandalorian',
    overview:
      'After the fall of the Empire, a lone bounty hunter makes his way through the outer reaches of the galaxy, far from the authority of the New Republic.',
    posterPath: '/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg',
    backdropPath: '/9ijMGlJKqcslswWUzTEwScm82Gs.jpg',
    firstAirDate: '2019-11-12',
    genres: ['Sci-Fi & Fantasy', 'Action & Adventure'],
    episodeRuntime: 40,
    seasons: [
      { season: 1, episodes: 8, year: 2019, runtime: 39 },
      { season: 2, episodes: 8, year: 2020, runtime: 42 },
      { season: 3, episodes: 8, year: 2023, runtime: 40 },
    ],
  },
  {
    id: -6,
    name: 'Friends',
    overview:
      'Six young people from New York City navigate life and love in this landmark ensemble comedy about friendship in your twenties and thirties.',
    posterPath: '/2koX1xLkpTQM4IZebYvKysFW1Nh.jpg',
    backdropPath: '/l0qVZIpXtIo7km9u5Yqh0nKPOr5.jpg',
    firstAirDate: '1994-09-22',
    genres: ['Comedy'],
    episodeRuntime: 22,
    seasons: [
      { season: 1, episodes: 24, year: 1994, runtime: 22 },
      { season: 2, episodes: 24, year: 1995, runtime: 22 },
      { season: 3, episodes: 25, year: 1996, runtime: 22 },
    ],
  },
  {
    id: -7,
    name: 'Chernobyl',
    overview:
      'A dramatisation of the true story of one of the worst man-made catastrophes in history, and the sacrifices made to save Europe from disaster.',
    posterPath: '/hlLXt2tOPT6RRnjiUmoxyG1LTfi.jpg',
    backdropPath: '/lPS10hgHZY7CqQvbcQBwyk9RhFj.jpg',
    firstAirDate: '2019-05-06',
    genres: ['Drama', 'History'],
    episodeRuntime: 65,
    seasons: [{ season: 1, episodes: 5, year: 2019, runtime: 65 }],
  },
  {
    id: -8,
    name: 'Attack on Titan',
    originalName: '進撃の巨人',
    overview:
      'Humanity fights for survival against giant humanoid Titans behind enormous walls, uncovering a conspiracy that reaches the heart of their world.',
    posterPath: '/hqA3vjOfW3RDhFXsHzE5wG1XVW6.jpg',
    backdropPath: '/2OZKKJ5nHgYkJQV1zHDdN0qBSb2.jpg',
    firstAirDate: '2013-04-07',
    genres: ['Animation', 'Action & Adventure', 'Sci-Fi & Fantasy'],
    episodeRuntime: 24,
    seasons: [
      { season: 1, episodes: 25, year: 2013, runtime: 24 },
      { season: 2, episodes: 12, year: 2017, runtime: 24 },
      { season: 3, episodes: 22, year: 2018, runtime: 24 },
    ],
  },
];

function buildEpisodes(seed: DemoShowSeed): Episode[] {
  const eps: Episode[] = [];
  for (const s of seed.seasons) {
    for (let n = 1; n <= s.episodes; n++) {
      // Spread episodes weekly through the season's air year.
      const air = new Date(s.year, 0, 1);
      air.setDate(air.getDate() + (n - 1) * 7 + s.season * 30);
      eps.push({
        id: episodeId(seed.id, s.season, n),
        showId: seed.id,
        seasonNumber: s.season,
        episodeNumber: n,
        name: `Episode ${n}`,
        airDate: air.toISOString().slice(0, 10),
        runtime: s.runtime,
      });
    }
  }
  return eps;
}

export function demoShows(): Show[] {
  return SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    originalName: s.originalName,
    overview: s.overview,
    posterPath: s.posterPath,
    backdropPath: s.backdropPath,
    firstAirDate: s.firstAirDate,
    genres: s.genres,
    numberOfSeasons: s.seasons.length,
    numberOfEpisodes: s.seasons.reduce((a, b) => a + b.episodes, 0),
    episodeRuntime: s.episodeRuntime,
    status: 'not_started' as const,
    addedAt: Date.now(),
  }));
}

export function demoEpisodes(showId: number): Episode[] {
  const seed = SEEDS.find((s) => s.id === showId);
  return seed ? buildEpisodes(seed) : [];
}

export function searchDemoShows(query: string): Show[] {
  const q = query.trim().toLowerCase();
  if (!q) return demoShows();
  return demoShows().filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.originalName?.toLowerCase().includes(q) ?? false),
  );
}
