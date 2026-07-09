import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeartHandshake, ArrowRight, X } from 'lucide-react';

const DISMISS_KEY = 'showtrack:tvtime-banner-dismissed';

/**
 * A warm, dismissible note on the Home page: TV Time is shutting down, but the
 * user can bring everything over here. Links straight to the import flow.
 */
export function TvTimeBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="relative mb-5 overflow-hidden rounded-lg border border-gold/25 bg-gold/[0.06] p-4 sm:p-5">
      <button
        onClick={dismiss}
        aria-label={t('common.close')}
        className="absolute end-2 top-2 grid h-7 w-7 place-items-center rounded-md text-muted hover:text-fg"
      >
        <X size={16} strokeWidth={2} />
      </button>
      <div className="flex items-start gap-3 pe-6">
        <HeartHandshake size={22} strokeWidth={1.5} className="mt-0.5 shrink-0 text-gold" />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug">
            {t('home.tvtime_title')}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t('home.tvtime_body')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link to="/import" className="btn-gold text-sm">
              {t('home.tvtime_cta')}
              <ArrowRight size={16} strokeWidth={2} className="rtl-flip" />
            </Link>
            <Link to="/settings" className="text-sm font-semibold text-gold hover:underline">
              {t('home.tvtime_how')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
