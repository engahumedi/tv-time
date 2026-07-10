import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, UserPlus, Clock3, Check } from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getProfile,
  getRelation,
  getUserData,
  follow,
  unfollow,
  type FollowStatus,
  type FriendData,
} from '../lib/social';
import { computeStats, breakdownTime } from '../lib/stats';
import { formatNumber } from '../lib/format';
import { ShowCard } from '../components/ShowCard';
import { MovieCard } from '../components/MovieCard';
import { Avatar } from './People';
import type { Profile } from '../types';

export function UserProfile() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isMe = user?.id === id;

  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [status, setStatus] = useState<FollowStatus>('none');
  const [targetPublic, setTargetPublic] = useState(false);
  const [data, setData] = useState<FriendData | null>(null);
  const [busy, setBusy] = useState(false);

  const canView = isMe || targetPublic || status === 'accepted';

  useEffect(() => {
    let cancelled = false;
    setProfile(undefined);
    setData(null);
    (async () => {
      const [p, rel] = await Promise.all([getProfile(id), getRelation(id)]);
      if (cancelled) return;
      setProfile(p);
      setStatus(rel.status);
      setTargetPublic(rel.targetPublic);
      if ((isMe || rel.targetPublic || rel.status === 'accepted') && p) {
        const d = await getUserData(id);
        if (!cancelled) setData(d);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isMe]);

  async function toggleFollow() {
    if (busy) return;
    setBusy(true);
    try {
      if (status === 'none') {
        const s = await follow(id);
        setStatus(s);
        if (s === 'accepted') setData(await getUserData(id));
      } else {
        await unfollow(id);
        setStatus('none');
        if (!targetPublic) setData(null);
      }
    } finally {
      setBusy(false);
    }
  }

  if (profile === undefined) {
    return <div className="pt-16 text-center text-faint">{t('common.loading')}</div>;
  }
  if (profile === null) {
    return <div className="pt-16 text-center text-faint">{t('people.not_found')}</div>;
  }

  const stats = data ? computeStats(data.shows, data.watches) : null;
  const time = stats ? breakdownTime(stats.totalMinutes) : null;
  const watchedMovies = (data?.movies ?? []).filter((m) => m.watched);
  const favShows = (data?.shows ?? []).filter((s) => s.favorite);
  const lang = i18n.language;

  return (
    <div className="mx-auto max-w-4xl pt-2">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={profile.displayName} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold leading-tight">{profile.displayName}</h1>
          <p className="truncate text-sm text-faint">@{profile.username}</p>
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
            {profile.isPublic ? t('people.public') : (<><Lock size={11} strokeWidth={2} /> {t('people.private')}</>)}
          </span>
        </div>
        {!isMe && <FollowButton status={status} busy={busy} onClick={toggleFollow} />}
      </div>

      {/* Locked */}
      {!canView ? (
        <div className="rounded-2xl border border-overlay/[0.08] bg-navy-800 p-8 text-center">
          <Lock size={26} strokeWidth={1.5} className="mx-auto mb-3 text-muted" />
          <p className="font-semibold">{t('people.locked_title')}</p>
          <p className="mt-1 text-sm text-muted">
            {status === 'pending' ? t('people.locked_pending') : t('people.locked_body')}
          </p>
        </div>
      ) : !data ? (
        <div className="pt-10 text-center text-faint">{t('common.loading')}</div>
      ) : (
        <div className="space-y-8">
          {/* Stats */}
          {stats && time && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value={formatNumber(stats.totalEpisodes, lang)} label={t('profile.episodes_watched')} />
              <Stat value={formatNumber(stats.totalShows, lang)} label={t('profile.shows_watched')} />
              <Stat value={formatNumber(watchedMovies.length, lang)} label={t('profile.movies_watched')} />
              <Stat value={`${formatNumber(time.days, lang)}${t('common.days').charAt(0)}`} label={t('profile.time_watched')} />
            </section>
          )}

          {favShows.length > 0 && (
            <Section title={t('show.favorite')}>
              <PosterRow>{favShows.map((s) => <div key={s.id} className="w-28 shrink-0"><ShowCard show={s} /></div>)}</PosterRow>
            </Section>
          )}

          {data.shows.length > 0 && (
            <Section title={t('discover.in_library')}>
              <PosterRow>{data.shows.map((s) => <div key={s.id} className="w-28 shrink-0"><ShowCard show={s} /></div>)}</PosterRow>
            </Section>
          )}

          {watchedMovies.length > 0 && (
            <Section title={t('profile.your_movies')}>
              <PosterRow>{watchedMovies.map((m) => <div key={m.id} className="w-28 shrink-0"><MovieCard movie={m} /></div>)}</PosterRow>
            </Section>
          )}

          {data.lists.length > 0 && (
            <Section title={t('profile.my_lists')}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.lists.map((l) => (
                  <div key={l.id} className="rounded-lg border border-overlay/[0.08] bg-navy-800 p-3">
                    <p className="truncate font-semibold">{l.name}</p>
                    <p className="text-xs text-muted">{t(l.kind === 'movie' ? 'lists.count_movies' : 'lists.count', { n: l.showIds.length })}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {stats && stats.totalEpisodes === 0 && watchedMovies.length === 0 && (
            <p className="py-8 text-center text-sm text-faint">{t('people.nothing_yet')}</p>
          )}
        </div>
      )}
    </div>
  );
}

function FollowButton({ status, busy, onClick }: { status: FollowStatus; busy: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  if (status === 'accepted')
    return <button onClick={onClick} disabled={busy} className="btn-ghost shrink-0 text-sm"><Check size={16} strokeWidth={2} />{t('people.following')}</button>;
  if (status === 'pending')
    return <button onClick={onClick} disabled={busy} className="btn-ghost shrink-0 text-sm"><Clock3 size={16} strokeWidth={2} />{t('people.requested')}</button>;
  return <button onClick={onClick} disabled={busy} className="btn-gold shrink-0 text-sm"><UserPlus size={16} strokeWidth={2} />{t('people.follow')}</button>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-overlay/[0.08] bg-navy-800 p-3.5">
      <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function PosterRow({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">{children}</div>;
}
