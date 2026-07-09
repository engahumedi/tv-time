import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS, CALENDAR_ITEM } from './navItems';

/** Mobile-first bottom tab bar (hidden on lg where the sidebar takes over). */
export function BottomNav() {
  const { t } = useTranslation();
  // Home · Discover · Calendar · Profile
  const items = [NAV_ITEMS[0], NAV_ITEMS[1], CALENDAR_ITEM, NAV_ITEMS[2]];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-overlay/[0.08] bg-navy-900/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-gold' : 'text-muted hover:text-fg'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isActive ? 1.9 : 1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {item.icon}
                </svg>
                <span>{t(`nav.${item.key}`)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
