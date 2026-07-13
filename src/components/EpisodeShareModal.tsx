import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Share2, Download } from 'lucide-react';
import { buildEpisodeCard } from '../lib/episodeShareCard';
import { triggerDownload } from '../lib/exporter';
import type { Episode, Show, WatchRecord } from '../types';

/** Generates a shareable image for a watched episode and lets you share/save it. */
export function EpisodeShareModal({
  episode,
  show,
  watch,
  onClose,
}: {
  episode: Episode;
  show: Show;
  watch: WatchRecord | null | undefined;
  onClose: () => void;
}) {
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
      const b = await buildEpisodeCard({
        showName: show.name,
        seasonEpisode: `S${String(episode.seasonNumber).padStart(2, '0')} · E${String(episode.episodeNumber).padStart(2, '0')}`,
        episodeName: episode.name,
        posterPath: show.posterPath ?? undefined,
        stillPath: episode.stillPath ?? undefined,
        rating: watch?.rating,
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
  }, [episode.id]);

  const filename = `${show.name}-S${episode.seasonNumber}E${episode.episodeNumber}.png`
    .replace(/[^\w.-]+/g, '_');

  async function share() {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });
    const text = `${show.name} — S${episode.seasonNumber} · E${episode.episodeNumber}`;
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], title: show.name, text });
        return;
      } catch {
        /* user dismissed — fall through to download */
      }
    }
    triggerDownload(blob, filename);
  }

  function download() {
    if (blob) triggerDownload(blob, filename);
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
            {t('episode.share_title')}
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
          <button onClick={download} disabled={!blob} className="btn-ghost flex-1 text-sm">
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
