// Ready-made profile pictures: iconic, widely-recognizable faces from film & TV.
// We reference TMDB's image CDN (the same source the app already uses for every
// poster/still), so nothing copyrighted is bundled or re-hosted here — picking
// one just stores the TMDB image URL as your avatar.

import { img } from './tmdb';

interface Preset {
  name: string;
  path: string;
}

const PRESETS: Preset[] = [
  { name: 'Robert Downey Jr.', path: '/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
  { name: 'Leonardo DiCaprio', path: '/mkdRcVIQl4WZhDf1vXKWTD7HZrZ.jpg' },
  { name: 'Scarlett Johansson', path: '/druW5adKddizHNSoPbI0q7Mvn0K.jpg' },
  { name: 'Keanu Reeves', path: '/8RZLOyYGsoRe9p44q3xin9QkMHv.jpg' },
  { name: 'Emma Watson', path: '/A14lLCZYDhfYdBa0fFRpwMDiwRN.jpg' },
  { name: 'Tom Holland', path: '/xKBAaPIa1c7tzZD3Y0MhBLv4hPE.jpg' },
  { name: 'Benedict Cumberbatch', path: '/wz3MRiMmoz6b5X3oSzMRC9nLxY1.jpg' },
  { name: 'Emilia Clarke', path: '/u59kTmNHXzaGZqokivxLPiBVIML.jpg' },
  { name: 'Cillian Murphy', path: '/2lKs67r7FI4bPu0AXxMUJZxmUXn.jpg' },
  { name: 'Bryan Cranston', path: '/npIIZJGSrcJIJ6yHdmbqO6Jzo5I.jpg' },
  { name: 'Aaron Paul', path: '/8Ac9uuoYwZoYVAIJfRLzzLsGGJn.jpg' },
  { name: 'Samuel L. Jackson', path: '/AiAYAqwpM5xmiFrAIeQvUXDCVvo.jpg' },
  { name: 'Dwayne Johnson', path: '/5QApZVV8FUFlVxQpIK3Ew6cqotq.jpg' },
  { name: 'Jason Statham', path: '/pXGSq2UpcDE2NMF8LR56QZf5U1q.jpg' },
  { name: 'Tom Cruise', path: '/3mShHjSQR7NXOVbdTu5rT2Qd0MN.jpg' },
  { name: 'Tom Hanks', path: '/oFvZoKI6lvU03n4YoNGAll9rkas.jpg' },
  { name: 'Brad Pitt', path: '/m09Y1YfPPeNYYUSHnnVqahkrC1o.jpg' },
  { name: 'Emily Blunt', path: '/5nCSG5TL1bP1geD8aaBfaLnLLCD.jpg' },
  { name: 'Helena Bonham Carter', path: '/hJMbNSPJ2PCahsP3rNEU39C8GWU.jpg' },
  { name: 'Robert De Niro', path: '/cT8htcckIuyI1Lqwt1CvD02ynTh.jpg' },
];

export interface PresetAvatar {
  name: string;
  url: string;
}

/** Preset avatars as ready-to-use image URLs. */
export const PRESET_AVATARS: PresetAvatar[] = PRESETS.map((p) => ({
  name: p.name,
  url: img(p.path, 'w200')!,
}));
