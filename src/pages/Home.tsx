import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useToWatch, useLibrary } from '../lib/hooks';
import { img } from '../lib/tmdb';
import { ShowCard } from '../components/ShowCard';
import { EmptyState } from '../components/EmptyState';
import { markWatched } from '../lib/repo';
import { celebrate } from '../lib/celebrate';
import { formatDate } from '../lib/format';
import type { Episode, Show } from '../types';

export function Home() {
  const { t, i18n } = useTranslation();
  const toWatch = useToWatch();
  const library = useLibrary();
  const navigate = useNavigate();

  if (toWatch === undefined || library === undefined) {
    return <RailSkeleton />;
  }

  if (library.length === 0) {
    return (
      <EmptyState
        icon="📺"
        title={t('home.empty_title')}
        body={t('home.empty_body')}
      >
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
    <div className="space-y-8 pt-2">
      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <h1 className="text-3xl font-extrabold lg:text-4xl">{t('home.title')}</h1>
        </div>
        <p className="mb-5 text-sm text-zinc-400">{t('home.subtitle')}</p>

        {toWatch.length === 0 ? (
          <div className="card p-6 text-center animate-fade-up">
            <div className="mb-2 text-4xl">🎉</div>
            <h3 className="font-bold">{t('home.caught_up_title')}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {t('home.caught_up_body')}
            </p>
            <Link to="/discover" className="btn-gold mt-4">
              {t('home.empty_cta')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {toWatch.map(({ show, episode }) => (
              <UpNextCard
                key={show.id}
                show={show}
                episode={episode}
                lang={i18n.language}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t('discover.in_library')}</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {library.slice(0, 21).map((s) => (
            <ShowCard key={s.id} show={s} />
          ))}
        </div>
      </section>
    </div>
  );
}

function UpNextCard({
  show,
  episode,
  lang,
}: {
  show: Show;
  episode: Episode;
  lang: string;
}) {
  const { t } = useTranslation();

  async function onWatch(e: React.MouseEvent) {
    e.preventDefault();
    await markWatched(episode, Date.now(), 'manual', show.episodeRuntime);
    celebrate('small');
  }

  const still = img(episode.stillPath || show.backdropPath, 'w500');

  return (
    <motion.div
      layout
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-navy-800"
    >
      <Link to={`/show/${show.id}`} className="block">
        {/* Episode thumbnail (16:9) */}
        <div className="relative aspect-video w-full overflow-hidden">
          {still ? (
            <img
              src={still}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full items-end p-3"
              style={{
                background:
                  'radial-gradient(120% 100% at 50% 0%, rgba(255,91,69,0.22), transparent 60%), #14131a',
              }}
            >
              <span className="text-3xl opacity-40">🎬</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p className="truncate font-bold leading-tight">{show.name}</p>
            <p className="mt-0.5 truncate text-xs text-zinc-300">
              <span className="text-gold-400">
                S{episode.seasonNumber} · E{episode.episodeNumber}
              </span>{' '}
              — {episode.name}
            </p>
          </div>
        </div>
      </Link>
      <button
        onClick={onWatch}
        className="absolute end-2.5 top-2.5 grid h-10 w-10 place-items-center rounded-full bg-navy-950/70 text-gold-400 backdrop-blur transition-all hover:bg-gold hover:text-white active:scale-90"
        aria-label={t('show.mark_watched')}
        title={t('show.mark_watched')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </button>
      {episode.airDate && (
        <span className="pointer-events-none absolute start-2.5 top-2.5 rounded-md bg-navy-950/70 px-1.5 py-0.5 text-[10px] text-zinc-300 backdrop-blur">
          {formatDate(episode.airDate, lang)}
        </span>
      )}
    </motion.div>
  );
}

function RailSkeleton() {
  return (
    <div className="grid gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="aspect-video rounded-2xl shimmer" />
      ))}
    </div>
  );
}
