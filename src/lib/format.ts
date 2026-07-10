import type { TFunction } from 'i18next';
import { breakdownTime } from './stats';

/** Format a minute total like "3 days · 4 hours" using the active language. */
export function formatWatchTime(totalMinutes: number, t: TFunction): string {
  const { days, hours, minutes } = breakdownTime(totalMinutes);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${t(days === 1 ? 'common.day' : 'common.days')}`);
  if (hours > 0) parts.push(`${hours} ${t(hours === 1 ? 'common.hour' : 'common.hours')}`);
  if (minutes > 0 && days === 0)
    parts.push(`${minutes} ${t(minutes === 1 ? 'common.minute' : 'common.minutes')}`);
  if (parts.length === 0) return `0 ${t('common.minutes')}`;
  return parts.slice(0, 2).join(' · ');
}

/** Locale-aware date, short form. */
export function formatDate(iso: string | number | null, lang: string): string {
  if (iso == null) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'ar' ? 'ar' : undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Localize integers (uses Arabic-Indic digits under `ar`). */
export function formatNumber(n: number, lang: string): string {
  return n.toLocaleString(lang === 'ar' ? 'ar-EG' : undefined);
}

/** Compact relative time ("3d ago"). `justNow` is the "moments ago" label. */
export function timeAgo(ts: number, lang: string, justNow: string): string {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return justNow;
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'en', { numeric: 'auto' });
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  const months = Math.floor(days / 30);
  if (months < 12) return rtf.format(-months, 'month');
  return rtf.format(-Math.floor(months / 12), 'year');
}
