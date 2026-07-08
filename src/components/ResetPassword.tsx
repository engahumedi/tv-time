import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { Logo } from './Sidebar';

/** Shown when the user arrives from a password-reset email link. */
export function ResetPassword() {
  const { t } = useTranslation();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t('auth.passwords_mismatch'));
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch {
      setError(t('auth.err_generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-6 py-16">
      <div className="mb-6 flex items-center justify-center gap-3">
        <Logo />
        <span className="text-2xl font-extrabold tracking-tight">{t('app.name')}</span>
      </div>

      <div className="card p-6 shadow-lift">
        {done ? (
          <div className="text-center">
            <div className="mb-3 text-4xl">✅</div>
            <h2 className="text-xl font-extrabold">{t('auth.password_updated')}</h2>
            <button
              className="btn-gold mt-5 w-full"
              onClick={() => window.location.reload()}
            >
              {t('auth.continue_to_app')}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold">{t('auth.reset_title')}</h2>
            <p className="mt-1 text-sm text-muted">{t('auth.reset_sub')}</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                type="password"
                required
                minLength={6}
                placeholder={t('auth.new_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                dir="ltr"
                autoComplete="new-password"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder={t('auth.confirm_password')}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input"
                dir="ltr"
                autoComplete="new-password"
              />
              {error && (
                <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {error}
                </p>
              )}
              <button type="submit" className="btn-gold w-full" disabled={busy}>
                {busy ? t('auth.working') : t('auth.update_password')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
