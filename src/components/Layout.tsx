import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomNav } from './BottomNav';
import { Sidebar, Logo } from './Sidebar';
import { LanguageToggle } from './LanguageToggle';
import { resetConfetti } from '../lib/celebrate';

/**
 * Responsive app shell.
 * - lg+ : persistent left sidebar, wide centered content area.
 * - < lg: compact top bar + bottom tab bar (mobile app feel).
 */
export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();

  // Clear any lingering celebration confetti when the route changes.
  useEffect(() => {
    resetConfetti();
  }, [location.pathname]);

  return (
    <div className="min-h-full">
      <Sidebar />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-navy-950/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-extrabold tracking-tight">
            {t('app.name')}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/calendar"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300"
            aria-label={t('nav.calendar')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </Link>
          <Link
            to="/import"
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300"
            aria-label={t('nav.import')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m8 11 4 4 4-4" />
              <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
            </svg>
          </Link>
          <LanguageToggle compact />
        </div>
      </header>

      <div className="lg:ps-60">
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-2 lg:px-10 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
