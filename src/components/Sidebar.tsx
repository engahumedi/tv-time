import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS, IMPORT_ITEM, type NavItem } from './navItems';
import { LanguageToggle } from './LanguageToggle';

/** Persistent left navigation for tablet/desktop (hidden on mobile). */
export function Sidebar() {
  const { t } = useTranslation();
  const items = [...NAV_ITEMS, IMPORT_ITEM];

  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e border-white/[0.07] bg-navy-900 px-4 py-6 lg:flex">
      <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
        <Logo />
        <span className="text-xl font-extrabold tracking-tight">
          {t('app.name')}
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map((item) => (
          <SideLink key={item.key} item={item} label={t(`nav.${item.key}`)} />
        ))}
      </nav>

      <div className="mt-auto px-1">
        <LanguageToggle />
      </div>
    </aside>
  );
}

function SideLink({ item, label }: { item: NavItem; label: string }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
          isActive
            ? 'bg-gold/10 text-gold-400'
            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={isActive ? 2.2 : 1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {item.icon}
          </svg>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Logo() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold text-white">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}
