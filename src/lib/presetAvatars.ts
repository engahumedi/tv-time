// Ready-made profile pictures: in-scene character shots from popular films & TV.
// We reference TMDB's image CDN (the same source the app already uses for every
// poster/still), so nothing copyrighted is bundled or re-hosted here — picking
// one just stores the TMDB image URL as your avatar. Each backdrop was visually
// checked to read clearly cropped to a circle at the app's default center crop.

import { img } from './tmdb';

interface Preset {
  name: string;
  path: string;
}

const PRESETS: Preset[] = [
  { name: 'Po', path: '/qdthf9WrRDSaIkGVQGhhJ9pz1hn.jpg' },
  { name: 'Shrek', path: '/w0eKUOEog2ImtktCHAMUZws8qif.jpg' },
  { name: 'Moana', path: '/iYLKMV7PIBtFmtygRrhSiyzcVsF.jpg' },
  { name: 'Spider-Verse', path: '/b9YkKJcW3pPaXgMZu9uoT7v9yRB.jpg' },
  { name: 'Frozen', path: '/u2bZhH3nTf0So0UIC1QxAqBvC07.jpg' },
  { name: 'Iron Man', path: '/cyecB7godJ6kNHGONFjUyVN9OX5.jpg' },
  { name: 'The Batman', path: '/eUORREWq2ThkkxyiCESCu3sVdGg.jpg' },
  { name: 'Joker', path: '/hw1CwteUFGjcWXwjGhKk8UJpWeA.jpg' },
  { name: 'Aquaman', path: '/9QusGjxcYvfPD1THg6oW3RLeNn7.jpg' },
  { name: 'The Mandalorian', path: '/9zcbqSxdsRMZWHYtyCd1nXPr2xq.jpg' },
  { name: 'Wednesday', path: '/sNLP0dLZcVBqYa3MchCXJqgDtFb.jpg' },
  { name: 'Harry Potter', path: '/1XAC6RPT01UX9EQGy2JVn5c8pgy.jpg' },
  { name: 'Wonder Woman', path: '/AaABt75ZzfMGrscUR2seabz4PEX.jpg' },
  { name: 'Deadpool', path: '/rFj9IKlL75B2pXhZA60jkNWvxeW.jpg' },
  { name: 'Doctor Strange', path: '/3zvZ699gMW2RhWc0GisIukzq0Ls.jpg' },
  { name: 'Thor', path: '/wBzMnQ01R9w58W6ucltdYfOyP4j.jpg' },
  { name: 'Buzz Lightyear', path: '/3Rfvhy1Nl6sSGJwyjb0QiZzZYlB.jpg' },
  { name: 'The Lion King', path: '/q00H8EqULYSK74lgevMkhmGGLHn.jpg' },
  { name: 'Jack Sparrow', path: '/uRNgkJSkNBFbbn9fPsEjDIy8Sh3.jpg' },
  { name: 'Avatar', path: '/8I37NtDffNV7AZlDa7uDvvqhovU.jpg' },
  { name: 'Dune', path: '/h61Kc0NC7d90jNwXfBx5js7DnSQ.jpg' },
  { name: 'The Witcher', path: '/foGkPxpw9h8zln81j63mix5B7m8.jpg' },
  { name: 'Loki', path: '/q3jHCb4dMfYF6ojikKuHd6LscxC.jpg' },
  { name: 'Squid Game', path: '/5aE1kxWg6RhgQxJTXTxifv4uq7P.jpg' },
  { name: 'Toothless', path: '/kxklJL1v8MYEU5xdU6W5VvmBwVz.jpg' },
];

export interface PresetAvatar {
  name: string;
  url: string;
}

/** Preset avatars as ready-to-use image URLs (TMDB backdrops). */
export const PRESET_AVATARS: PresetAvatar[] = PRESETS.map((p) => ({
  name: p.name,
  url: img(p.path, 'w780')!,
}));
