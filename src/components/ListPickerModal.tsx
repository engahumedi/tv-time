import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLists } from '../lib/hooks';
import { createList, toggleShowInList } from '../lib/repo';

/** Pick which lists a show belongs to (with a quick "create list" field). */
export function ListPickerModal({
  showId,
  onClose,
}: {
  showId: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const lists = useLists();
  const [name, setName] = useState('');

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const list = await createList(name);
    await toggleShowInList(list.id, showId);
    setName('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-sm rounded-t-3xl p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">{t('lists.manage')}</h2>

        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {(lists ?? []).map((l) => {
            const inList = l.showIds.includes(showId);
            return (
              <button
                key={l.id}
                onClick={() => toggleShowInList(l.id, showId)}
                className="flex w-full items-center justify-between rounded-xl bg-overlay/[0.04] px-3 py-2.5 text-start hover:bg-overlay/[0.08]"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{l.name}</span>
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full border ${
                    inList ? 'border-gold bg-gold text-navy-950' : 'border-overlay/20'
                  }`}
                >
                  {inList && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <form onSubmit={create} className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('lists.name_placeholder')}
            className="input flex-1"
          />
          <button type="submit" className="btn-gold shrink-0 text-sm">
            {t('lists.create')}
          </button>
        </form>

        <button onClick={onClose} className="btn-ghost mt-3 w-full text-sm">
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
