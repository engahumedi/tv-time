import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, UserCheck, Check, X, Tv } from 'lucide-react';
import { useNotifications, markAllSeen, type Notif } from '../lib/notifications';
import { acceptRequest, rejectRequest } from '../lib/social';
import { img } from '../lib/tmdb';
import { timeAgo } from '../lib/format';
import { EmptyState } from '../components/EmptyState';
import { Avatar } from './People';

export function Notifications() {
  const { t, i18n } = useTranslation();
  const { notifs, refresh } = useNotifications();

  // Opening the page clears the unread badge.
  useEffect(() => {
    markAllSeen();
  }, []);

  async function accept(n: Notif) {
    if (!n.profile) return;
    await acceptRequest(n.profile.id);
    refresh();
  }
  async function reject(n: Notif) {
    if (!n.profile) return;
    await rejectRequest(n.profile.id);
    refresh();
  }

  return (
    <div className="mx-auto max-w-2xl pt-2">
      <h1 className="mb-5 text-3xl font-bold lg:text-4xl">{t('notifications.title')}</h1>

      {notifs === null ? (
        <p className="text-sm text-faint">{t('common.loading')}</p>
      ) : notifs.length === 0 ? (
        <EmptyState
          icon={<Bell size={22} strokeWidth={1.5} />}
          title={t('notifications.empty_title')}
          body={t('notifications.empty_body')}
        />
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <NotifRow
              key={n.id}
              n={n}
              lang={i18n.language}
              onAccept={() => accept(n)}
              onReject={() => reject(n)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotifRow({
  n,
  lang,
  onAccept,
  onReject,
}: {
  n: Notif;
  lang: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { t } = useTranslation();
  const when = timeAgo(n.ts, lang, t('notifications.just_now'));

  if (n.type === 'episode') {
    const poster = img(n.posterPath, 'w200');
    return (
      <Link
        to={`/show/${n.showId}`}
        className="flex items-center gap-3 rounded-xl border border-overlay/[0.07] bg-navy-800 p-2.5 hover:bg-navy-700"
      >
        <div className="grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded bg-navy-700 text-muted">
          {poster ? (
            <img src={poster} alt="" className="h-full w-full object-cover" />
          ) : (
            <Tv size={16} strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <span className="font-semibold">{n.showName}</span>{' '}
            {t('notifications.new_episode')}
          </p>
          <p className="truncate text-xs text-faint">
            {t('notifications.episode_label', { s: n.season, e: n.episode })}
            {n.episodeName ? ` · ${n.episodeName}` : ''} · {when}
          </p>
        </div>
        <Tv size={17} strokeWidth={1.75} className="shrink-0 text-muted" />
      </Link>
    );
  }

  const profile = n.profile!;
  const label =
    n.type === 'request' ? 'notifications.requested_follow'
    : n.type === 'accepted' ? 'notifications.request_accepted'
    : 'notifications.started_following';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-overlay/[0.07] bg-navy-800 p-2.5">
      <Link to={`/u/${profile.id}`} className="shrink-0">
        <Avatar name={profile.displayName} url={profile.avatarUrl} />
      </Link>
      <Link to={`/u/${profile.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-semibold">{profile.displayName}</span>{' '}
          {t(label)}
        </p>
        <p className="truncate text-xs text-faint">@{profile.username} · {when}</p>
      </Link>
      {n.type === 'request' ? (
        <>
          <button onClick={onAccept} className="grid h-9 w-9 place-items-center rounded-lg bg-gold text-navy-950" aria-label={t('people.accept')}>
            <Check size={17} strokeWidth={2.5} />
          </button>
          <button onClick={onReject} className="grid h-9 w-9 place-items-center rounded-lg border border-overlay/10 text-muted hover:text-rose-300" aria-label={t('people.reject')}>
            <X size={17} strokeWidth={2} />
          </button>
        </>
      ) : (
        <span className="shrink-0 text-muted">
          <UserCheck size={18} strokeWidth={1.75} />
        </span>
      )}
    </div>
  );
}
