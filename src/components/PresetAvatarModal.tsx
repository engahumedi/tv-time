import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { PRESET_AVATARS } from '../lib/presetAvatars';

/** Grid of ready-made avatars (famous faces from film & TV) to pick from. */
export function PresetAvatarModal({
  onCancel,
  onPick,
}: {
  onCancel: () => void;
  onPick: (url: string) => void;
}) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const items = PRESET_AVATARS.filter((p) => !failed.has(p.url));

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-950/85 backdrop-blur-sm sm:items-center" onClick={onCancel}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-lg font-bold">{t('settings.preset_title')}</h2>
          <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-fg" aria-label={t('common.cancel')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <p className="px-5 pb-3 text-xs text-faint">{t('settings.preset_hint')}</p>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {items.map((p) => (
              <button
                key={p.url}
                onClick={() => onPick(p.url)}
                className="group flex flex-col items-center gap-1"
                title={p.name}
              >
                <img
                  src={p.url}
                  alt={p.name}
                  loading="lazy"
                  onError={() => setFailed((s) => new Set(s).add(p.url))}
                  className="aspect-square w-full rounded-full object-cover ring-1 ring-overlay/10 transition-all group-hover:ring-2 group-hover:ring-gold"
                />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
