import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Check, X, Users, Clock3, Tv, Clapperboard, Heart, MessageCircle, Trash2 } from 'lucide-react';
import {
  searchProfiles,
  incomingRequests,
  outgoingRequests,
  acceptRequest,
  rejectRequest,
  unfollow,
  myFollowMap,
  friendsFeed,
  activitySocial,
  likeActivity,
  unlikeActivity,
  commentActivity,
  deleteComment,
  onSocialChanged,
  type FollowStatus,
  type FeedItem,
  type ActivitySocial,
  type ActivityComment,
} from '../lib/social';
import { img } from '../lib/tmdb';
import { timeAgo } from '../lib/format';
import { FollowButton } from '../components/FollowButton';
import { EmptyState } from '../components/EmptyState';
import type { Profile } from '../types';

type Tab = 'activity' | 'find';

export function People() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('activity');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'activity', label: t('people.tab_activity') },
    { key: 'find', label: t('people.tab_find') },
  ];

  return (
    <div className="pt-2">
      <h1 className="mb-4 text-3xl font-bold lg:text-4xl">{t('people.title')}</h1>

      <div className="mb-5 flex gap-6 border-b border-overlay/[0.08]">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition-colors ${
              tab === tb.key ? 'border-gold text-fg' : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'activity' ? <ActivityTab /> : <FindTab />}
    </div>
  );
}

/* ---------------- Activity (friends feed) ---------------- */

function ActivityTab() {
  const { t, i18n } = useTranslation();
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [social, setSocial] = useState<Map<string, ActivitySocial>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const f = await friendsFeed().catch(() => [] as FeedItem[]);
      if (cancelled) return;
      setFeed(f);
      if (f.length) {
        const s = await activitySocial(f.map((x) => x.id)).catch(() => new Map());
        if (!cancelled) setSocial(s);
      }
    };
    load();
    const off = onSocialChanged(load);
    return () => { cancelled = true; off(); };
  }, []);

  if (feed === null) return <p className="text-sm text-faint">{t('common.loading')}</p>;
  if (feed.length === 0)
    return (
      <EmptyState icon={<Users size={22} strokeWidth={1.5} />} title={t('people.feed_empty_title')} body={t('people.feed_empty_body')} />
    );

  return (
    <div className="space-y-2">
      {feed.map((it) => (
        <FeedRow key={it.id} item={it} lang={i18n.language} initial={social.get(it.id)} />
      ))}
    </div>
  );
}

function FeedRow({ item, lang, initial }: { item: FeedItem; lang: string; initial?: ActivitySocial }) {
  const { t } = useTranslation();
  const poster = img(item.poster, 'w200');
  const to = item.kind === 'movie' ? `/movie/${item.movieId}` : `/show/${item.showId}`;
  const when = timeAgo(item.ts, lang, t('notifications.just_now'));

  const [likes, setLikes] = useState(initial?.likes ?? 0);
  const [liked, setLiked] = useState(initial?.likedByMe ?? false);
  const [comments, setComments] = useState<ActivityComment[]>(initial?.comments ?? []);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) {
      setLikes(initial.likes);
      setLiked(initial.likedByMe);
      setComments(initial.comments);
    }
  }, [initial]);

  async function toggleLike() {
    if (liked) { setLiked(false); setLikes((n) => Math.max(0, n - 1)); await unlikeActivity(item.id); }
    else { setLiked(true); setLikes((n) => n + 1); await likeActivity(item.id, item.user.id); }
  }
  async function addComment() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    const c = await commentActivity(item.id, item.user.id, text);
    setBusy(false);
    if (c) { setComments((cs) => [...cs, c]); setDraft(''); }
  }
  async function removeComment(id: string) {
    setComments((cs) => cs.filter((c) => c.id !== id));
    await deleteComment(id);
  }

  return (
    <div className="rounded-xl border border-overlay/[0.07] bg-navy-800 p-2.5">
      <div className="flex items-center gap-3">
        <Link to={`/u/${item.user.id}`} className="shrink-0">
          <Avatar name={item.user.displayName} url={item.user.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            <Link to={`/u/${item.user.id}`} className="font-semibold hover:underline">{item.user.displayName}</Link>{' '}
            {t(item.kind === 'movie' ? 'people.feed_watched_movie' : 'people.feed_watched_episode')}
          </p>
          <p className="truncate text-xs text-faint">
            {item.title}
            {item.kind === 'episode' && item.season != null ? ` · ${t('notifications.episode_label', { s: item.season, e: item.episode })}` : ''}
            {when ? ` · ${when}` : ''}
          </p>
        </div>
        <Link to={to} className="grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded bg-navy-700 text-muted">
          {poster ? <img src={poster} alt="" className="h-full w-full object-cover" /> : item.kind === 'movie' ? <Clapperboard size={16} strokeWidth={1.75} /> : <Tv size={16} strokeWidth={1.75} />}
        </Link>
      </div>

      {/* Like / comment bar */}
      <div className="mt-2 flex items-center gap-4 ps-[3.25rem] text-xs text-muted">
        <button onClick={toggleLike} className={`inline-flex items-center gap-1 ${liked ? 'text-rose-400' : 'hover:text-fg'}`}>
          <Heart size={15} strokeWidth={1.9} fill={liked ? 'currentColor' : 'none'} />
          {likes > 0 && <span>{likes}</span>}
        </button>
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 hover:text-fg">
          <MessageCircle size={15} strokeWidth={1.9} />
          {comments.length > 0 && <span>{comments.length}</span>}
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-2 ps-[3.25rem]">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Link to={`/u/${c.profile.id}`} className="shrink-0">
                <Avatar name={c.profile.displayName} url={c.profile.avatarUrl} size={26} />
              </Link>
              <div className="min-w-0 flex-1 rounded-lg bg-overlay/[0.04] px-2.5 py-1.5">
                <p className="text-xs font-semibold">{c.profile.displayName}</p>
                <p className="text-sm leading-snug">{c.body}</p>
              </div>
              {c.mine && (
                <button onClick={() => removeComment(c.id)} className="mt-1 shrink-0 text-faint hover:text-rose-300" aria-label={t('common.remove')}>
                  <Trash2 size={13} strokeWidth={1.8} />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              placeholder={t('people.comment_placeholder')}
              maxLength={280}
              className="flex-1 rounded-lg border border-overlay/[0.08] bg-navy-700 px-3 py-1.5 text-sm outline-none focus:border-gold/50"
            />
            <button onClick={addComment} disabled={busy || !draft.trim()} className="btn-gold text-xs">
              {t('people.post')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Find (search + requests) ---------------- */

function FindTab() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [incoming, setIncoming] = useState<Profile[]>([]);
  const [outgoing, setOutgoing] = useState<Profile[]>([]);
  const [followMap, setFollowMap] = useState<Map<string, FollowStatus>>(new Map());
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const loadRequests = () => {
    incomingRequests().then(setIncoming).catch(() => {});
    outgoingRequests().then(setOutgoing).catch(() => {});
    myFollowMap().then(setFollowMap).catch(() => {});
  };

  useEffect(() => {
    loadRequests();
    const off = onSocialChanged(loadRequests);
    return off;
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        setResults(await searchProfiles(q));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  async function accept(p: Profile) {
    await acceptRequest(p.id);
    setIncoming((r) => r.filter((x) => x.id !== p.id));
  }
  async function reject(p: Profile) {
    await rejectRequest(p.id);
    setIncoming((r) => r.filter((x) => x.id !== p.id));
  }
  async function cancelOutgoing(p: Profile) {
    await unfollow(p.id);
    setOutgoing((r) => r.filter((x) => x.id !== p.id));
  }

  return (
    <>
      {/* Incoming follow requests */}
      {incoming.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">{t('people.requests')}</h2>
          <div className="space-y-2">
            {incoming.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-overlay/[0.07] bg-navy-800 p-2.5">
                <Avatar name={p.displayName} url={p.avatarUrl} />
                <Link to={`/u/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.displayName}</p>
                  <p className="truncate text-xs text-faint">@{p.username}</p>
                </Link>
                <button onClick={() => accept(p)} className="grid h-9 w-9 place-items-center rounded-lg bg-gold text-navy-950" aria-label={t('people.accept')}>
                  <Check size={17} strokeWidth={2.5} />
                </button>
                <button onClick={() => reject(p)} className="grid h-9 w-9 place-items-center rounded-lg border border-overlay/10 text-muted hover:text-rose-300" aria-label={t('people.reject')}>
                  <X size={17} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Outgoing (sent) requests awaiting approval */}
      {outgoing.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted">{t('people.sent_requests')}</h2>
          <div className="space-y-2">
            {outgoing.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-overlay/[0.07] bg-navy-800 p-2.5">
                <Avatar name={p.displayName} url={p.avatarUrl} />
                <Link to={`/u/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.displayName}</p>
                  <p className="truncate text-xs text-faint">@{p.username}</p>
                </Link>
                <button onClick={() => cancelOutgoing(p)} className="btn-ghost shrink-0 text-xs">
                  <Clock3 size={14} strokeWidth={2} />{t('people.cancel_request')}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-faint">
          <Search size={19} strokeWidth={1.75} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('people.search_placeholder')}
          className="w-full rounded-2xl border border-overlay/[0.08] bg-navy-800 py-3 ps-11 pe-4 text-base outline-none transition-colors placeholder:text-faint focus:border-gold/60"
        />
      </div>

      {loading && <p className="text-sm text-faint">{t('common.loading')}</p>}

      {!loading && results && results.length === 0 && (
        <EmptyState icon={<Users size={22} strokeWidth={1.5} />} title={t('people.no_results')} body="" />
      )}

      {!loading && results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border border-overlay/[0.07] bg-navy-800 p-2.5">
              <Link to={`/u/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90">
                <Avatar name={p.displayName} url={p.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.displayName}</p>
                  <p className="truncate text-xs text-faint">@{p.username}</p>
                </div>
              </Link>
              <FollowButton targetId={p.id} initialStatus={followMap.get(p.id) ?? 'none'} size="sm" />
            </div>
          ))}
        </div>
      )}

      {!loading && !results && incoming.length === 0 && outgoing.length === 0 && (
        <EmptyState icon={<Users size={22} strokeWidth={1.5} />} title={t('people.empty_title')} body={t('people.empty_body')} />
      )}
    </>
  );
}

export function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-navy-700 font-display text-muted"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}
