import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { AuthModal } from './AuthModal';

/** Account / sync panel shown on the Profile page (only when auth is enabled). */
export function AccountCard() {
  const { t } = useTranslation();
  const { enabled, ready, user, syncing, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (!enabled) return null; // Supabase not configured — hide entirely.

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">
        {t('auth.account')}
      </h2>

      {!ready ? (
        <div className="h-9 w-40 rounded shimmer" />
      ) : user ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">{t('auth.signed_in_as')}</p>
            <p className="truncate font-semibold" dir="ltr">
              {user.email}
            </p>
            {syncing && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gold-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                {t('auth.syncing')}
              </p>
            )}
          </div>
          <button className="btn-ghost text-sm" onClick={() => signOut()}>
            {t('auth.sign_out')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xs text-sm text-zinc-400">{t('auth.sync_blurb')}</p>
          <button className="btn-gold text-sm" onClick={() => setShowAuth(true)}>
            {t('auth.sign_in')}
          </button>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </section>
  );
}
