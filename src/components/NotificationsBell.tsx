import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { useNotifications } from '../lib/notifications';

/** Bell button with an unread badge. Links to the notifications page. */
export function NotificationsBell({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  const { unread } = useNotifications();

  return (
    <Link
      to="/notifications"
      className={`relative grid h-9 w-9 place-items-center rounded-lg border border-overlay/[0.08] bg-overlay/[0.04] text-fg ${className}`}
      aria-label={t('notifications.title')}
    >
      <Bell size={18} strokeWidth={1.7} />
      {unread > 0 && (
        <span className="absolute -end-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy-950">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
