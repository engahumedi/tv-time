import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomNav } from './BottomNav';
import { Sidebar, Logo } from './Sidebar';
import { LanguageToggle } from './LanguageToggle';
import { NotificationsBell } from './NotificationsBell';
import { Onboarding, hasOnboarded } from './Onboarding';
import { resetConfetti } from '../lib/celebrate';

/**
 * Responsive app shell.
 * - lg+ : persistent left sidebar, wide centered content area.
 * - < lg: compact top bar + bottom tab bar (mobile app feel).
 */
export function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [showIntro, setShowIntro] = useState(() => !hasOnboarded());

  // Clear any lingering celebration confetti when the route changes.
  useEffect(() => {
    resetConfetti();
  }, [location.pathname]);

  return (
    <div className="min-h-full">
      <Sidebar />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-overlay/[0.06] bg-navy-950/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-bold tracking-tight">
            {t('app.name')}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <Link
            to="/settings"
            className="grid h-9 w-9 place-items-center rounded-lg border border-overlay/[0.08] bg-overlay/[0.04] text-fg"
            aria-label={t('nav.settings')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

      {showIntro && <Onboarding onClose={() => setShowIntro(false)} />}
    </div>
  );
}
