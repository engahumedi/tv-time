import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, ListPlus } from 'lucide-react';
import { createList } from '../lib/repo';
import type { ShowList } from '../types';

/**
 * Create a list right where you are — no page hop. Pick shows vs movies, name
 * it, done. Used from both the Profile and the Lists page.
 */
export function NewListModal({
  defaultKind = 'show',
  onClose,
  onCreated,
}: {
  defaultKind?: 'show' | 'movie';
  onClose: () => void;
  onCreated?: (list: ShowList) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'show' | 'movie'>(defaultKind);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const list = await createList(name, kind);
    setBusy(false);
    onCreated?.(list);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong w-full max-w-sm rounded-t-3xl p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ListPlus size={19} strokeWidth={1.75} className="text-gold" />
            {t('lists.new')}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-fg"
            aria-label={t('common.close')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Shows / Movies kind */}
          <div className="flex gap-2">
            {(['show', 'movie'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  kind === k
                    ? 'border-gold/60 bg-gold/[0.08] text-gold'
                    : 'border-overlay/10 text-muted hover:text-fg'
                }`}
              >
                {k === 'show' ? t('discover.kind_shows') : t('discover.kind_movies')}
              </button>
            ))}
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('lists.name_placeholder')}
            className="input"
            autoFocus
          />

          <button type="submit" className="btn-gold w-full" disabled={!name.trim() || busy}>
            {t('lists.create')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
