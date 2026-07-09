import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts';
import type { Episode, WatchRecord } from '../types';

const GOLD = '#c9a24b';
const GOLD_DIM = 'rgba(201,162,75,0.42)';

interface Point {
  key: string;
  label: string;
  rating: number;
  name: string;
  season: number;
}

/**
 * The classic TV Time "episode rating" graph: every episode you've given a
 * star rating, in air order, coloured by season so the shape of a show's
 * quality across its run is visible at a glance.
 */
export function EpisodeRatingGraph({
  episodes,
  watches,
}: {
  episodes: Episode[];
  watches: WatchRecord[];
}) {
  const { t } = useTranslation();

  const data = useMemo<Point[]>(() => {
    const ratingByEp = new Map<string, number>();
    for (const w of watches) {
      if (w.rating && w.rating > 0) ratingByEp.set(w.episodeId, w.rating);
    }
    return [...episodes]
      .sort(
        (a, b) =>
          a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber,
      )
      .filter((e) => ratingByEp.has(e.id))
      .map((e) => ({
        key: e.id,
        label: `S${e.seasonNumber}·E${e.episodeNumber}`,
        rating: ratingByEp.get(e.id)!,
        name: e.name,
        season: e.seasonNumber,
      }));
  }, [episodes, watches]);

  // A graph needs at least a couple of points to be meaningful.
  if (data.length < 2) return null;

  const avg = data.reduce((a, p) => a + p.rating, 0) / data.length;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {t('show.ratings_graph')}
        </h2>
        <span className="text-xs text-faint">
          {t('show.ratings_avg', { n: avg.toFixed(1) })}
        </span>
      </div>
      <div className="rounded-2xl border border-overlay/[0.07] bg-navy-800 p-3">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="label" hide />
            <YAxis
              domain={[0, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fill: '#8a8a86', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ fill: 'rgba(128,128,128,0.1)' }}
              contentStyle={tooltipStyle}
              labelStyle={{ color: 'rgb(var(--fg))', fontWeight: 600 }}
              formatter={(v: number) => [t('show.ratings_stars', { n: v }), '']}
              labelFormatter={(_l, payload) => {
                const p = payload?.[0]?.payload as Point | undefined;
                return p ? `${p.label} · ${p.name}` : '';
              }}
            />
            <Bar dataKey="rating" radius={[3, 3, 0, 0]} maxBarSize={22}>
              {data.map((p) => (
                <Cell key={p.key} fill={p.season % 2 === 0 ? GOLD_DIM : GOLD} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

const tooltipStyle = {
  background: 'rgb(var(--card))',
  border: '1px solid rgb(var(--overlay) / 0.12)',
  borderRadius: 8,
  color: 'rgb(var(--fg))',
  fontSize: 12,
} as const;
