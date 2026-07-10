// Ready-made profile pictures: iconic characters from popular films.
// We reference TMDB's image CDN (the same source the app already uses for every
// poster/still), so nothing copyrighted is bundled or re-hosted here — picking
// one just stores the TMDB image URL as your avatar. Each entry is a
// character-forward poster hand-checked to read well cropped to a circle.

import { img } from './tmdb';

interface Preset {
  name: string;
  path: string;
}

const PRESETS: Preset[] = [
  { name: 'Shrek', path: '/iB64vpL3dIObOtMZgX3RqdVdQDc.jpg' },
  { name: 'Woody & Buzz', path: '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg' },
  { name: 'Po', path: '/wWt4JYXTg5Wr3xBW2phBrMKgp3x.jpg' },
  { name: 'Elsa & Anna', path: '/itAKcobTYGpYT8Phwjd8c9hleTo.jpg' },
  { name: 'Minions', path: '/dr02BdCNAUPVU07aOodwPYv6HCf.jpg' },
  { name: 'Simba', path: '/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg' },
  { name: 'Moana & Maui', path: '/9tzN8sPbyod2dsa0lwuvrwBDWra.jpg' },
  { name: 'Baymax', path: '/2mxS4wUimwlLmI1xp6QW6NSU361.jpg' },
  { name: 'Sulley & Mike', path: '/wFSpyMsp7H0ttERbxY7Trlv8xry.jpg' },
  { name: 'Puss in Boots', path: '/kuf6dutpsT0vSVehic3EZIqkOBt.jpg' },
  { name: 'Zootopia', path: '/hlK0e0wAQ3VLuJcsfIYPvb4JVud.jpg' },
  { name: 'Spider-Verse', path: '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg' },
  { name: 'Toothless', path: '/ygGmAO60t8GyqUo9xYeYxSZAR3b.jpg' },
  { name: 'Aladdin & Genie', path: '/eLFfl7vS8dkeG1hKp5mwbm37V83.jpg' },
  { name: 'The Incredibles', path: '/2LqaLgk4Z226KkgPJuiOQ58wvrm.jpg' },
  { name: 'Encanto', path: '/4j0PNHkMr5ax3IA8tjtxcmPU3QT.jpg' },
  { name: 'Rapunzel', path: '/ym7Kst6a4uodryxqbGOxmewF235.jpg' },
  { name: 'Ice Age', path: '/gLhHHZUzeseRXShoDyC4VqLgsNv.jpg' },
  { name: 'Madagascar', path: '/zMpJY5CJKUufG9OTw0In4eAFqPX.jpg' },
  { name: 'Remy', path: '/t3vaWRPSf6WjDSamIkKDs1iQWna.jpg' },
];

export interface PresetAvatar {
  name: string;
  url: string;
}

/** Preset avatars as ready-to-use image URLs. */
export const PRESET_AVATARS: PresetAvatar[] = PRESETS.map((p) => ({
  name: p.name,
  url: img(p.path, 'w500')!,
}));
