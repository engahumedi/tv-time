import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  useWatchList,
  useLibrary,
  useCalendar,
  type WatchListItem,
  type CalendarItem,
} from '../lib/hooks';
import { img } from '../lib/tmdb';
import { ShowCard } from '../components/ShowCard';
import { EmptyState } from '../components/EmptyState';
import { markWatched } from '../lib/repo';
import { celebrate } from '../lib/celebrate';
import { formatDate } from '../lib/format';

const STALE_MS = 30 * 864e5; // 30 days

export function Home() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<'list' | 'upcoming'>('list');
  const [grid, setGrid] = useState(false);
  const watchList = useWatchList();
  const library = useLibrary();
  const navigate = useNavigate();

  if (watchList === undefined || library === undefined) return <Skeleton />;

  if (library.length === 0) {
    return (
      <EmptyState icon="📺" title={t('home.empty_title')} body={t('home.empty_body')}>
        <div className="flex flex-col gap-3">
          <button className="btn-gold" onClick={() => navigate('/discover')}>
            {t('home.empty_cta')}
          </button>
          <Link to="/import" className="btn-ghost">
            {t('home.import_cta')}
          </Link>
        </div>
      </EmptyState>
    );
  }

  return (
    <div className="pt-1">
      {/* Tabs */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-full bg-overlay/[0.05] p-1">
          {(['list', 'upcoming'] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                tab === tb ? 'bg-gold text-white' : 'text-fg hover:text-white'
              }`}
            >
              {tb === 'list' ? t('home.watch_list') : t('home.upcoming')}
            </button>
          ))}
        </div>
        {tab === 'list' && (
          <button
            onClick={() => setGrid((g) => !g)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-overlay/10 bg-overlay/[0.04] text-fg hover:text-white"
            aria-label={grid ? 'List view' : 'Grid view'}
          >
            {grid ? <ListIcon /> : <GridIcon />}
          </button>
        )}
      </div>

      {tab === 'list' ? (
        <WatchListView items={watchList} grid={grid} library={library} />
      ) : (
        <UpcomingView lang={i18n.language} />
      )}
    </div>
  );
}

function WatchListView({
  items,
  grid,
  library,
}: {
  items: WatchListItem[];
  grid: boolean;
  library: import('../types').Show[];
}) {
  const { t } = useTranslation();

  if (grid) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {library.map((s) => (
          <ShowCard key={s.id} show={s} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="mb-2 text-4xl">🎉</div>
        <h3 className="font-bold">{t('home.caught_up_title')}</h3>
        <p className="mt-1 text-sm text-muted">{t('home.caught_up_body')}</p>
      </div>
    );
  }

  const now = Date.now();
  const next = items
    .filter((i) => i.lastWatchedAt === 0 || now - i.lastWatchedAt <= STALE_MS)
    .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
  const stale = items
    .filter((i) => i.lastWatchedAt > 0 && now - i.lastWatchedAt > STALE_MS)
    .sort((a, b) => a.lastWatchedAt - b.lastWatchedAt);

  return (
    <div className="space-y-6">
      {next.length > 0 && <Section label={t('home.watch_next')} items={next} />}
      {stale.length > 0 && <Section label={t('home.stale')} items={stale} />}
    </div>
  );
}

function Section({ label, items }: { label: string; items: WatchListItem[] }) {
  return (
    <section>
      <div className="mb-3 flex">
        <span className="rounded-full bg-overlay/[0.06] px-3 py-1 text-xs font-bold uppercase tracking-wide text-fg">
          {label}
        </span>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {items.map((item) => (
          <WatchRow key={item.show.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function WatchRow({ item }: { item: WatchListItem }) {
  const { t } = useTranslation();
  const { show, episode, remaining, isPremiere } = item;
  const thumb = img(episode.stillPath || show.backdropPath, 'w342');

  async function onWatch(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await markWatched(episode, Date.now(), 'manual', show.episodeRuntime);
    celebrate('small');
  }

  return (
    <motion.div layout className="flex overflow-hidden rounded-2xl border border-overlay/[0.07] bg-navy-800">
      <Link to={`/show/${show.id}`} className="relative w-28 shrink-0 sm:w-32">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: 'radial-gradient(120% 120% at 50% 0%, rgba(255,91,69,0.25), transparent 60%), #15131a' }}
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <Link
            to={`/show/${show.id}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-overlay/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-fg hover:border-gold/60"
          >
            <span className="truncate">{show.name}</span>
            <svg className="rtl-flip shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
          <p className="mt-1.5 text-base font-extrabold">
            S{String(episode.seasonNumber).padStart(2, '0')} | E
            {String(episode.episodeNumber).padStart(2, '0')}
            {remaining > 0 && (
              <span className="ms-1.5 align-middle text-xs font-semibold text-faint">
                +{remaining}
              </span>
            )}
          </p>
          <p className="truncate text-sm text-muted">{episode.name}</p>
          {isPremiere && (
            <span className="mt-1.5 inline-block rounded bg-gold px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-white">
              {t('home.premiere')}
            </span>
          )}
        </div>

        <button
          onClick={onWatch}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-overlay/10 text-fg transition-all hover:bg-gold hover:text-white active:scale-90"
          aria-label={t('show.mark_watched')}
          title={t('show.mark_watched')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </button>
      </div>
    </motion.div>
  );
}

function UpcomingView({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const items = useCalendar();
  if (items === undefined) return <Skeleton />;

  const dayStart = new Date().setHours(0, 0, 0, 0);
  const future = items.filter((i) => i.ts >= dayStart);

  if (future.length === 0) {
    return (
      <EmptyState
        icon="🗓️"
        title={t('home.upcoming_empty_title')}
        body={t('home.upcoming_empty_body')}
      />
    );
  }

  const weekEnd = dayStart + 7 * 864e5;
  const groups = [
    { key: 'today', label: t('calendar.today'), items: future.filter((i) => i.ts < dayStart + 864e5) },
    { key: 'week', label: t('calendar.this_week'), items: future.filter((i) => i.ts >= dayStart + 864e5 && i.ts < weekEnd) },
    { key: 'later', label: t('calendar.later'), items: future.filter((i) => i.ts >= weekEnd) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          <div className="mb-3 flex">
            <span className="rounded-full bg-overlay/[0.06] px-3 py-1 text-xs font-bold uppercase tracking-wide text-fg">
              {g.label}
            </span>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {g.items.map((it) => (
              <UpcomingRow key={it.episode.id} item={it} lang={lang} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function UpcomingRow({ item, lang }: { item: CalendarItem; lang: string }) {
  const { show, episode, ts } = item;
  const thumb = img(episode.stillPath || show.backdropPath, 'w342');
  return (
    <Link
      to={`/show/${show.id}`}
      className="flex overflow-hidden rounded-2xl border border-overlay/[0.07] bg-navy-800 hover:bg-navy-700"
    >
      <div className="w-28 shrink-0 sm:w-32">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: 'radial-gradient(120% 120% at 50% 0%, rgba(255,91,69,0.2), transparent 60%), #15131a' }} />
        )}
      </div>
      <div className="min-w-0 flex-1 p-3">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-fg">
          {show.name}
        </p>
        <p className="mt-1 text-base font-extrabold">
          S{String(episode.seasonNumber).padStart(2, '0')} | E
          {String(episode.episodeNumber).padStart(2, '0')}
        </p>
        <p className="truncate text-sm text-muted">{episode.name}</p>
        <p className="mt-1 text-xs font-semibold text-gold-400">
          {formatDate(ts, lang)}
        </p>
      </div>
    </Link>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
  );
}
function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-3 pt-8 xl:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex overflow-hidden rounded-2xl border border-overlay/[0.07] bg-navy-800">
          <div className="h-24 w-28 shimmer sm:w-32" />
          <div className="flex-1 space-y-2 p-3">
            <div className="h-4 w-1/2 rounded shimmer" />
            <div className="h-3 w-1/3 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
