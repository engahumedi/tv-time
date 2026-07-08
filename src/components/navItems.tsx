import type { ReactNode } from 'react';

export interface NavItem {
  to: string;
  key: string;
  icon: ReactNode;
}

/** Shared nav definitions used by both the desktop sidebar and mobile tab bar. */
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    key: 'home',
    icon: (
      <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" />
    ),
  },
  {
    to: '/discover',
    key: 'discover',
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  {
    to: '/profile',
    key: 'profile',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </>
    ),
  },
];

export const CALENDAR_ITEM: NavItem = {
  to: '/calendar',
  key: 'calendar',
  icon: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
};

export const LISTS_ITEM: NavItem = {
  to: '/lists',
  key: 'lists',
  icon: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
};

export const IMPORT_ITEM: NavItem = {
  to: '/import',
  key: 'import',
  icon: (
    <>
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
    </>
  ),
};
