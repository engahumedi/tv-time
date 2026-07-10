// Local UI settings: theme + accent + display name.

export type Theme = 'dark' | 'light';
export type Accent = 'amber' | 'blue' | 'green' | 'purple' | 'rose';

const THEME_KEY = 'showtrack:theme';
const ACCENT_KEY = 'showtrack:accent';
const NAME_KEY = 'showtrack:name';

/** RGB channels for each accent: [base, 400, 600, 700]. */
export const ACCENTS: Record<Accent, [string, string, string, string]> = {
  amber: ['201 162 75', '214 181 108', '176 138 56', '143 111 46'],
  blue: ['96 165 250', '147 197 253', '59 130 246', '37 99 235'],
  green: ['52 211 153', '110 231 183', '16 185 129', '5 150 105'],
  purple: ['167 139 250', '196 181 253', '139 92 246', '124 58 237'],
  rose: ['251 113 133', '253 164 175', '244 63 94', '225 29 72'],
};

export function getAccent(): Accent {
  const v = localStorage.getItem(ACCENT_KEY);
  return v && v in ACCENTS ? (v as Accent) : 'amber';
}

export function applyAccent(accent: Accent): void {
  const [base, a400, a600, a700] = ACCENTS[accent];
  const s = document.documentElement.style;
  s.setProperty('--accent', base);
  s.setProperty('--accent-400', a400);
  s.setProperty('--accent-600', a600);
  s.setProperty('--accent-700', a700);
}

export function setAccent(accent: Accent): void {
  localStorage.setItem(ACCENT_KEY, accent);
  applyAccent(accent);
}

export function getTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f4f4f6' : '#0a0a0b');
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function getDisplayName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function setDisplayName(name: string): void {
  if (name.trim()) localStorage.setItem(NAME_KEY, name.trim());
  else localStorage.removeItem(NAME_KEY);
}

// Apply the stored theme + accent as early as possible.
applyTheme(getTheme());
applyAccent(getAccent());
