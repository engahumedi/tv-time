import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Tv, CalendarClock, Check, ChevronRight, LayoutGrid, List as ListIco, Dices, Clapperboard } from 'lucide-react';
import {
  useWatchList,
  useLibrary,
  useCalendar,
  useWatchlistMovies,
  type WatchListItem,
  type CalendarItem,
} from '../lib/hooks';
import { img } from '../lib/tmdb';
import { LibraryGrid } from '../components/LibraryGrid';
import { MovieCard } from '../components/MovieCard';
import { EmptyState } from '../components/EmptyState';
import { TvTimeBanner } from '../components/TvTimeBanner';
import { RandomPickModal } from '../components/RandomPickModal';
import { markWatched } from '../lib/repo';
import { celebrate } from '../lib/celebrate';
import { formatDate } from '../lib/format';
import type { Movie } from '../types';

const STALE_MS = 30 * 864e5; // 30 days

type Tab = 'list' | 'upcoming' | 'movies';

export function Home() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('list');
  const [grid, setGrid] = useState(false);
  const [random, setRandom] = useState(false);
  const watchList = useWatchList();
  const library = useLibrary();
  const watchlistMovies = useWatchlistMovies();
  const navigate = useNavigate();

  if (watchList === undefined || library === undefined || watchlistMovies === undefined)
    return <Skeleton />;

  const canPick = watchList.length > 0 || watchlistMovies.length > 0;

  if (library.length === 0 && watchlistMovies.length === 0) {
    return (
      <div className="pt-1">
        <TvTimeBanner />
        <EmptyState icon={<Tv size={22} strokeWidth={1.5} />} title={t('home.empty_title')} body={t('home.empty_body')}>
          <div className="flex flex-col gap-3">
            <button className="btn-gold" onClick={() => navigate('/discover')}>
              {t('home.empty_cta')}
            </button>
            <Link to="/import" className="btn-ghost">
              {t('home.import_cta')}
            </Link>
          </div>
        </EmptyState>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'list', label: t('home.watch_list') },
    { key: 'upcoming', label: t('home.upcoming') },
    { key: 'movies', label: t('movie.watchlist') },
  ];

  return (
    <div className="pt-1">
      <TvTimeBanner />
      {/* Tabs — underlined, editorial */}
      <div className="mb-5 flex items-end justify-between border-b border-overlay/[0.08]">
        <div className="no-scrollbar flex gap-6 overflow-x-auto">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`-mb-px shrink-0 border-b-2 pb-2.5 text-sm font-semibold transition-colors ${
                tab === tb.key
                  ? 'border-gold text-fg'
                  : 'border-transparent text-muted hover:text-fg'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {canPick && (
            <button
              onClick={() => setRandom(true)}
              className="mb-1.5 grid h-8 w-8 place-items-center rounded-md text-muted hover:text-gold"
              aria-label={t('random.open')}
              title={t('random.open')}
            >
              <Dices size={18} strokeWidth={1.75} />
            </button>
          )}
          {tab === 'list' && (
            <button
              onClick={() => setGrid((g) => !g)}
              className="mb-1.5 grid h-8 w-8 place-items-center rounded-md text-muted hover:text-fg"
              aria-label={grid ? 'List view' : 'Grid view'}
            >
              {grid ? <ListIco size={18} strokeWidth={1.75} /> : <LayoutGrid size={18} strokeWidth={1.75} />}
            </button>
          )}
        </div>
      </div>

      {tab === 'list' ? (
        <WatchListView items={watchList} grid={grid} library={library} />
      ) : tab === 'upcoming' ? (
        <UpcomingView lang={i18n.language} />
      ) : (
        <MoviesView movies={watchlistMovies} />
      )}

      {random && <RandomPickModal onClose={() => setRandom(false)} />}
    </div>
  );
}

function MoviesView({ movies }: { movies: Movie[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (movies.length === 0) {
    return (
      <EmptyState
        icon={<Clapperboard size={22} strokeWidth={1.5} />}
        title={t('movie.watchlist_empty_title')}
        body={t('movie.watchlist_empty_body')}
      >
        <button className="btn-gold" onClick={() => navigate('/discover')}>
          {t('home.empty_cta')}
        </button>
      </EmptyState>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
      {movies.map((m) => (
        <MovieCard key={m.id} movie={m} />
      ))}
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
    return <LibraryGrid shows={library} />;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md py-10 text-start">
        <div className="mb-4 inline-grid h-12 w-12 place-items-center rounded-lg border border-overlay/[0.08] text-gold">
          <Check size={22} strokeWidth={1.75} />
        </div>
        <h3 className="font-display text-2xl font-semibold">{t('home.caught_up_title')}</h3>
        <p className="mt-1.5 text-sm text-muted">{t('home.caught_up_body')}</p>
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
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
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
            style={{ background: 'radial-gradient(120% 120% at 50% 0%, rgba(201,162,75,0.25), transparent 60%), #15131a' }}
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
            <ChevronRight size={12} strokeWidth={2.25} className="rtl-flip shrink-0" />
          </Link>
          <p className="mt-1.5 text-base font-bold">
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
            <span className="mt-1.5 inline-block rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
              {t('home.premiere')}
            </span>
          )}
        </div>

        <button
          onClick={onWatch}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-overlay/[0.12] text-muted transition-all hover:border-gold hover:bg-gold hover:text-navy-950 active:scale-90"
          aria-label={t('show.mark_watched')}
          title={t('show.mark_watched')}
        >
          <Check size={20} strokeWidth={2.25} />
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
        icon={<CalendarClock size={22} strokeWidth={1.5} />}
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
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
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
          <div className="h-full w-full" style={{ background: 'radial-gradient(120% 120% at 50% 0%, rgba(201,162,75,0.2), transparent 60%), #15131a' }} />
        )}
      </div>
      <div className="min-w-0 flex-1 p-3">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-fg">
          {show.name}
        </p>
        <p className="mt-1 text-base font-bold">
          S{String(episode.seasonNumber).padStart(2, '0')} | E
          {String(episode.episodeNumber).padStart(2, '0')}
        </p>
        <p className="truncate text-sm text-muted">{episode.name}</p>
        <p className="mt-1 text-xs font-semibold text-gold">
          {formatDate(ts, lang)}
        </p>
      </div>
    </Link>
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
