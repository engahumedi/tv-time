import { useTranslation } from 'react-i18next';
import type { ShowStatus } from '../types';

const STYLES: Record<ShowStatus, string> = {
  not_started: 'bg-white/10 text-slate-300',
  watching: 'bg-gold/20 text-gold-400',
  up_to_date: 'bg-emerald-500/20 text-emerald-300',
  finished: 'bg-sky-500/20 text-sky-300',
  stopped: 'bg-rose-500/20 text-rose-300',
};

export function StatusBadge({ status }: { status: ShowStatus }) {
  const { t } = useTranslation();
  return (
    <span className={`chip ${STYLES[status]}`}>{t(`status.${status}`)}</span>
  );
}
