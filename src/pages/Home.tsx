import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useToWatch, useLibrary } from '../lib/hooks';
import { Poster } from '../components/Poster';
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

  return (
    <motion.div layout className="card flex items-center gap-3 p-3">
      <Link to={`/show/${show.id}`} className="shrink-0">
        <Poster
          path={show.posterPath}
          alt={show.name}
          size="w200"
          className="h-24 w-16 rounded-lg"
        />
      </Link>
      <Link to={`/show/${show.id}`} className="min-w-0 flex-1">
        <p className="truncate font-semibold">{show.name}</p>
        <p className="mt-0.5 text-sm text-gold-400">
          S{episode.seasonNumber} · E{episode.episodeNumber}
        </p>
        <p className="truncate text-xs text-slate-400">{episode.name}</p>
        {episode.airDate && (
          <p className="mt-0.5 text-[11px] text-slate-500">
            {t('home.aired', { date: formatDate(episode.airDate, lang) })}
          </p>
        )}
      </Link>
      <button
        onClick={onWatch}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold/15 text-gold-400 transition-all hover:bg-gold hover:text-navy-950 active:scale-90"
        aria-label={t('show.mark_watched')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </button>
    </motion.div>
  );
}

function RailSkeleton() {
  return (
    <div className="space-y-3 pt-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card flex items-center gap-3 p-3">
          <div className="h-24 w-16 rounded-lg shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 rounded shimmer" />
            <div className="h-3 w-1/3 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
