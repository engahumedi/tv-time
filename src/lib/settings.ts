// Local UI settings: theme + display name.

export type Theme = 'dark' | 'light';

const THEME_KEY = 'showtrack:theme';
const NAME_KEY = 'showtrack:name';

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

// Apply the stored theme as early as possible.
applyTheme(getTheme());
