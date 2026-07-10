import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Copy, Check, Share2 } from 'lucide-react';

/** Build the absolute, shareable URL to a user's public profile page. */
function profileUrl(userId: string): string {
  const { origin, pathname } = window.location;
  // Keep the app's base path (e.g. /tv-time/) but drop any existing hash route.
  const base = `${origin}${pathname}`.replace(/#.*$/, '');
  return `${base}#/u/${userId}`;
}

export function ShareProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const url = profileUrl(userId);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    // Lazy-load the QR encoder so it never weighs down the initial bundle.
    import('qrcode')
      .then((m) =>
        m.toDataURL(url, { margin: 1, width: 240, color: { dark: '#0e0d12', light: '#ffffff' } }),
      )
      .then((data) => !cancelled && setQr(data))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the field is selectable as a fallback */
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ url }); } catch { /* user dismissed */ }
    } else {
      copy();
    }
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
            <Share2 size={19} strokeWidth={1.75} className="text-gold" />
            {t('profile.share_title')}
          </h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-fg" aria-label={t('common.close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="grid h-[240px] w-[240px] place-items-center overflow-hidden rounded-2xl bg-white">
            {qr ? <img src={qr} alt="" width={240} height={240} /> : <span className="text-sm text-navy-950/60">…</span>}
          </div>
          <p className="mt-3 text-center text-xs text-muted">{t('profile.share_hint')}</p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input readOnly value={url} dir="ltr" className="input flex-1 text-xs" onFocus={(e) => e.currentTarget.select()} />
          <button onClick={copy} className="btn-ghost shrink-0 text-sm" aria-label={t('profile.copy_link')}>
            {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
          </button>
        </div>

        <button onClick={nativeShare} className="btn-gold mt-3 w-full text-sm">
          <Share2 size={16} strokeWidth={1.9} />
          {t('profile.share_cta')}
        </button>
      </motion.div>
    </div>
  );
}
