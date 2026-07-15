import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Share2, Download } from 'lucide-react';
import { buildShareCard } from '../lib/episodeShareCard';
import { triggerDownload } from '../lib/exporter';
import type { Movie } from '../types';

/** Generates a shareable image for a watched movie and lets you share/save it. */
export function MovieShareModal({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      const year = movie.releaseDate?.slice(0, 4);
      const runtime = movie.runtime ? t('episode.runtime', { n: movie.runtime }) : '';
      const subtitle = [year, runtime].filter(Boolean).join(' · ');
      const b = await buildShareCard({
        title: movie.title,
        subtitle,
        posterPath: movie.posterPath ?? undefined,
        stillPath: movie.backdropPath ?? undefined,
        rating: movie.userRating ? Math.round(movie.userRating / 2) : undefined,
        brand: t('app.name'),
        url: 'engahumedi.github.io/tv-time',
      });
      if (cancelled) return;
      if (!b) {
        setFailed(true);
        return;
      }
      setBlob(b);
      objectUrl = URL.createObjectURL(b);
      setPreview(objectUrl);
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie.id]);

  const filename = `${movie.title}.png`.replace(/[^\w.-]+/g, '_');

  async function share() {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], title: movie.title });
        return;
      } catch {
        /* dismissed — fall through */
      }
    }
    triggerDownload(blob, filename);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-950/85 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong w-full max-w-lg rounded-t-3xl p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Share2 size={19} strokeWidth={1.75} className="text-gold" />
            {t('movie.share_title')}
          </h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-fg" aria-label={t('common.close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl ring-1 ring-overlay/10">
          {preview ? (
            <img src={preview} alt="" className="w-full" />
          ) : failed ? (
            <p className="p-8 text-center text-sm text-muted">{t('episode.share_failed')}</p>
          ) : (
            <div className="aspect-[1200/630] w-full shimmer" />
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => blob && triggerDownload(blob, filename)} disabled={!blob} className="btn-ghost flex-1 text-sm">
            <Download size={16} strokeWidth={1.9} /> {t('episode.share_save')}
          </button>
          <button onClick={share} disabled={!blob} className="btn-gold flex-1 text-sm">
            <Share2 size={16} strokeWidth={1.9} /> {t('episode.share_cta')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
