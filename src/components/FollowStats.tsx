import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { followCounts, onSocialChanged } from '../lib/social';
import { formatNumber } from '../lib/format';
import { ConnectionsModal } from './ConnectionsModal';

/**
 * Followers / following counts for a user, rendered as two tappable pills.
 * Tapping one opens the connections list (privacy-gated server-side).
 */
export function FollowStats({ userId, isMe = false }: { userId: string; isMe?: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null);
  const [open, setOpen] = useState<'followers' | 'following' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => followCounts(userId).then((c) => !cancelled && setCounts(c)).catch(() => {});
    load();
    const off = onSocialChanged(load);
    return () => {
      cancelled = true;
      off();
    };
  }, [userId]);

  const followers = counts?.followers ?? 0;
  const following = counts?.following ?? 0;

  return (
    <>
      <div className="flex gap-5">
        <button onClick={() => setOpen('followers')} className="group text-start">
          <span className="font-display text-base font-semibold tabular-nums group-hover:text-gold">
            {formatNumber(followers, lang)}
          </span>{' '}
          <span className="text-sm text-muted">{t('people.followers')}</span>
        </button>
        <button onClick={() => setOpen('following')} className="group text-start">
          <span className="font-display text-base font-semibold tabular-nums group-hover:text-gold">
            {formatNumber(following, lang)}
          </span>{' '}
          <span className="text-sm text-muted">{t('people.following')}</span>
        </button>
      </div>

      {open && (
        <ConnectionsModal userId={userId} initialKind={open} isMe={isMe} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
