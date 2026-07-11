import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, UserPlus, Clock3, Check, Ban, ShieldOff } from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getProfile,
  getRelation,
  getUserData,
  follow,
  unfollow,
  block,
  unblock,
  type FollowStatus,
  type FriendData,
} from '../lib/social';
import { computeStats } from '../lib/stats';
import { useLibrary, useMovies } from '../lib/hooks';
import { ShowCard } from '../components/ShowCard';
import { MovieCard } from '../components/MovieCard';
import { ProfileStats } from '../components/ProfileStats';
import { Avatar } from './People';
import { FollowStats } from '../components/FollowStats';
import type { Profile } from '../types';

export function UserProfile() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isMe = user?.id === id;

  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [status, setStatus] = useState<FollowStatus>('none');
  const [targetPublic, setTargetPublic] = useState(false);
  const [iBlocked, setIBlocked] = useState(false);
  const [data, setData] = useState<FriendData | null>(null);
  const [busy, setBusy] = useState(false);
  const [allShows, setAllShows] = useState(false);
  const [allMovies, setAllMovies] = useState(false);
  const [allShared, setAllShared] = useState(false);

  // My own library, to compute what we've both watched.
  const myShows = useLibrary();
  const myMovies = useMovies();

  const canView = !iBlocked && (isMe || targetPublic || status === 'accepted');

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
      setIBlocked(rel.iBlocked);
      if (!rel.iBlocked && (isMe || rel.targetPublic || rel.status === 'accepted') && p) {
        const d = await getUserData(id);
        if (!cancelled) setData(d);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isMe]);

  async function toggleBlock() {
    if (busy) return;
    setBusy(true);
    try {
      if (iBlocked) {
        await unblock(id);
        setIBlocked(false);
      } else {
        if (!confirm(t('people.block_confirm'))) return;
        await block(id);
        setIBlocked(true);
        setStatus('none');
        setData(null);
      }
    } finally {
      setBusy(false);
    }
  }

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
  const watchedMovies = (data?.movies ?? []).filter((m) => m.watched);
  const movieMinutes = watchedMovies.reduce((a, m) => a + (m.runtime || 0), 0);
  const favShows = (data?.shows ?? []).filter((s) => s.favorite);
  const lang = i18n.language;

  // Shows/movies we've both watched (only meaningful on someone else's profile).
  const myShowIds = new Set((myShows ?? []).map((s) => s.id));
  const myMovieIds = new Set((myMovies ?? []).filter((m) => m.watched).map((m) => m.id));
  const sharedShows = isMe ? [] : (data?.shows ?? []).filter((s) => myShowIds.has(s.id));
  const sharedMovies = isMe ? [] : watchedMovies.filter((m) => myMovieIds.has(m.id));

  return (
    <div className="mx-auto max-w-4xl pt-2">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={profile.displayName} url={profile.avatarUrl} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold leading-tight">{profile.displayName}</h1>
          <p className="truncate text-sm text-faint">@{profile.username}</p>
          <div className="mt-1.5"><FollowStats userId={id} /></div>
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
            {profile.isPublic ? t('people.public') : (<><Lock size={11} strokeWidth={2} /> {t('people.private')}</>)}
          </span>
        </div>
        {!isMe && !iBlocked && <FollowButton status={status} busy={busy} onClick={toggleFollow} />}
      </div>

      {/* Block / unblock */}
      {!isMe && (
        <div className="mb-6 -mt-2">
          <button
            onClick={toggleBlock}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-rose-300"
          >
            {iBlocked ? (<><ShieldOff size={14} strokeWidth={1.9} /> {t('people.unblock')}</>) : (<><Ban size={14} strokeWidth={1.9} /> {t('people.block')}</>)}
          </button>
        </div>
      )}

      {/* Blocked */}
      {iBlocked ? (
        <div className="rounded-2xl border border-overlay/[0.08] bg-navy-800 p-8 text-center">
          <Ban size={26} strokeWidth={1.5} className="mx-auto mb-3 text-muted" />
          <p className="font-semibold">{t('people.blocked_title')}</p>
          <p className="mt-1 text-sm text-muted">{t('people.blocked_body')}</p>
        </div>
      ) : !canView ? (
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
          {/* Stats — same layout as your own profile */}
          {stats && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">{t('profile.stats')}</h2>
              <ProfileStats
                stats={stats}
                watchedMovies={watchedMovies.length}
                movieMinutes={movieMinutes}
                lang={lang}
              />
            </section>
          )}

          {/* Watched in common */}
          {(sharedShows.length > 0 || sharedMovies.length > 0) && (
            <Shelf
              title={t('people.in_common')}
              expandable={sharedShows.length + sharedMovies.length > 6}
              expanded={allShared}
              onToggle={() => setAllShared((v) => !v)}
            >
              {allShared ? (
                <div className="space-y-3">
                  {sharedShows.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                      {sharedShows.map((s) => <ShowCard key={s.id} show={s} />)}
                    </div>
                  )}
                  {sharedMovies.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                      {sharedMovies.map((m) => <MovieCard key={m.id} movie={m} />)}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {sharedShows.length > 0 && (
                    <PosterRow>{sharedShows.map((s) => <div key={s.id} className="w-28 shrink-0"><ShowCard show={s} /></div>)}</PosterRow>
                  )}
                  {sharedMovies.length > 0 && (
                    <div className={sharedShows.length > 0 ? 'mt-3' : ''}>
                      <PosterRow>{sharedMovies.map((m) => <div key={m.id} className="w-28 shrink-0"><MovieCard movie={m} /></div>)}</PosterRow>
                    </div>
                  )}
                </>
              )}
            </Shelf>
          )}

          {favShows.length > 0 && (
            <Section title={t('show.favorite')}>
              <PosterRow>{favShows.map((s) => <div key={s.id} className="w-28 shrink-0"><ShowCard show={s} /></div>)}</PosterRow>
            </Section>
          )}

          {data.shows.length > 0 && (
            <Shelf
              title={t('people.their_shows', { name: profile.displayName })}
              expandable={data.shows.length > 6}
              expanded={allShows}
              onToggle={() => setAllShows((v) => !v)}
            >
              {allShows ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {data.shows.map((s) => <ShowCard key={s.id} show={s} />)}
                </div>
              ) : (
                <PosterRow>{data.shows.map((s) => <div key={s.id} className="w-28 shrink-0"><ShowCard show={s} /></div>)}</PosterRow>
              )}
            </Shelf>
          )}

          {watchedMovies.length > 0 && (
            <Shelf
              title={t('people.their_movies', { name: profile.displayName })}
              expandable={watchedMovies.length > 6}
              expanded={allMovies}
              onToggle={() => setAllMovies((v) => !v)}
            >
              {allMovies ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {watchedMovies.map((m) => <MovieCard key={m.id} movie={m} />)}
                </div>
              ) : (
                <PosterRow>{watchedMovies.map((m) => <div key={m.id} className="w-28 shrink-0"><MovieCard movie={m} /></div>)}</PosterRow>
              )}
            </Shelf>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** A titled shelf with an optional "See all" toggle to expand into a grid. */
function Shelf({
  title,
  expandable,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {expandable && (
          <button onClick={onToggle} className="shrink-0 text-sm font-semibold text-gold hover:underline">
            {expanded ? t('common.show_less') : t('common.seeAll')}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function PosterRow({ children }: { children: React.ReactNode }) {
  return <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">{children}</div>;
}
