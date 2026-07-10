import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Users, UserMinus } from 'lucide-react';
import { followList, removeFollower, onSocialChanged } from '../lib/social';
import { Avatar } from '../pages/People';
import { EmptyState } from './EmptyState';
import type { Profile } from '../types';

/**
 * A tabbed followers / following list for a given user. The DB gates what's
 * actually returned (private accounts only expose the list to accepted
 * followers), so an empty list here can also mean "not allowed to see it".
 * When it's my own profile, followers can be removed inline.
 */
export function ConnectionsModal({
  userId,
  initialKind,
  isMe = false,
  onClose,
}: {
  userId: string;
  initialKind: 'followers' | 'following';
  isMe?: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<'followers' | 'following'>(initialKind);
  const [people, setPeople] = useState<Profile[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      setPeople(null);
      followList(userId, kind)
        .then((p) => !cancelled && setPeople(p))
        .catch(() => !cancelled && setPeople([]));
    };
    load();
    const off = onSocialChanged(load);
    return () => {
      cancelled = true;
      off();
    };
  }, [userId, kind]);

  async function remove(id: string) {
    setPeople((list) => (list ? list.filter((p) => p.id !== id) : list));
    await removeFollower(id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong flex max-h-[80vh] w-full max-w-sm flex-col rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex gap-2">
            {(['followers', 'following'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  kind === k ? 'bg-gold/[0.12] text-gold' : 'text-muted hover:text-fg'
                }`}
              >
                {t(`people.${k}`)}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-fg"
            aria-label={t('common.close')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {people === null ? (
            <p className="py-8 text-center text-sm text-faint">{t('common.loading')}</p>
          ) : people.length === 0 ? (
            <EmptyState icon={<Users size={22} strokeWidth={1.5} />} title={t('people.no_connections')} body="" />
          ) : (
            <div className="space-y-2">
              {people.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-overlay/[0.07] bg-navy-800 p-2.5">
                  <Link to={`/u/${p.id}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90">
                    <Avatar name={p.displayName} url={p.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.displayName}</p>
                      <p className="truncate text-xs text-faint">@{p.username}</p>
                    </div>
                  </Link>
                  {isMe && kind === 'followers' && (
                    <button
                      onClick={() => remove(p.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-overlay/10 text-muted hover:text-rose-300"
                      aria-label={t('people.remove_follower')}
                      title={t('people.remove_follower')}
                    >
                      <UserMinus size={16} strokeWidth={1.9} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
