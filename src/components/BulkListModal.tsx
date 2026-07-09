import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Plus, ListPlus } from 'lucide-react';
import { useLists } from '../lib/hooks';
import { createList, addItemsToList } from '../lib/repo';

/**
 * Add a batch of shows to a list at once (used by the library bulk-select bar).
 * Only handles show lists — bulk-selecting movies isn't wired up yet.
 */
export function BulkListModal({
  itemIds,
  onClose,
  onDone,
}: {
  itemIds: number[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const lists = useLists();
  const [name, setName] = useState('');
  const showLists = (lists ?? []).filter((l) => (l.kind ?? 'show') === 'show');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function addTo(id: string) {
    await addItemsToList(id, itemIds);
    onDone();
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const list = await createList(name, 'show');
    await addItemsToList(list.id, itemIds);
    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ListPlus size={19} strokeWidth={1.75} className="text-gold" />
            {t('library.add_n_to_list', { n: itemIds.length })}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-fg"
            aria-label={t('common.close')}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={createAndAdd} className="mb-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('lists.name_placeholder')}
            className="input flex-1 py-2 text-sm"
          />
          <button type="submit" className="btn-gold shrink-0 px-3 py-2 text-sm" aria-label={t('lists.new')}>
            <Plus size={16} strokeWidth={2.25} />
          </button>
        </form>

        {showLists.length === 0 ? (
          <p className="text-sm text-faint">{t('lists.empty_body')}</p>
        ) : (
          <ul className="space-y-1">
            {showLists.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => addTo(l.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-overlay/[0.07] bg-navy-800 px-4 py-3 text-start hover:border-gold/40"
                >
                  <span className="truncate font-semibold">{l.name}</span>
                  <span className="text-xs text-faint">{t('lists.count', { n: l.showIds.length })}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
