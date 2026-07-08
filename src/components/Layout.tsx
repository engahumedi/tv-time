import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomNav } from './BottomNav';
import { LanguageToggle } from './LanguageToggle';

/** App shell: top brand bar, routed content, and the bottom nav. */
export function Layout() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-navy-950">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            {t('app.name')}
          </span>
        </Link>
        <LanguageToggle compact />
      </header>

      <main className="flex-1 px-4 pb-28">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
