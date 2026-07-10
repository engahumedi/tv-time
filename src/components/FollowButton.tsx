import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Clock3, Check } from 'lucide-react';
import { follow, unfollow, type FollowStatus } from '../lib/social';

/**
 * Follow / Requested / Following toggle. Owns its own status so it can be
 * dropped into search results and profile headers alike.
 */
export function FollowButton({
  targetId,
  initialStatus,
  size = 'md',
  onChange,
}: {
  targetId: string;
  initialStatus: FollowStatus;
  size?: 'sm' | 'md';
  onChange?: (s: FollowStatus) => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<FollowStatus>(initialStatus);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      let next: FollowStatus;
      if (status === 'none') next = await follow(targetId);
      else {
        await unfollow(targetId);
        next = 'none';
      }
      setStatus(next);
      onChange?.(next);
    } finally {
      setBusy(false);
    }
  }

  const cls = size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm';
  if (status === 'accepted')
    return <button onClick={toggle} disabled={busy} className={`btn-ghost shrink-0 ${cls}`}><Check size={size === 'sm' ? 14 : 16} strokeWidth={2} />{t('people.following')}</button>;
  if (status === 'pending')
    return <button onClick={toggle} disabled={busy} className={`btn-ghost shrink-0 ${cls}`}><Clock3 size={size === 'sm' ? 14 : 16} strokeWidth={2} />{t('people.requested')}</button>;
  return <button onClick={toggle} disabled={busy} className={`btn-gold shrink-0 ${cls}`}><UserPlus size={size === 'sm' ? 14 : 16} strokeWidth={2} />{t('people.follow')}</button>;
}
