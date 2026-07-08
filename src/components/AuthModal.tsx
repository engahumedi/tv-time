import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';

/** Email + password sign-in / sign-up sheet. */
export function AuthModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'up') {
        await signUp(email.trim(), password);
        // If email confirmation is on, there's no session yet.
        setNotice(t('auth.check_email'));
      } else {
        await signIn(email.trim(), password);
        onClose();
      }
    } catch (err) {
      setError(friendlyError(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold">
          {mode === 'in' ? t('auth.sign_in') : t('auth.sign_up')}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{t('auth.sync_blurb')}</p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">
              {t('auth.email')}
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">
              {t('auth.password')}
            </span>
            <input
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              dir="ltr"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {notice}
            </p>
          )}

          <button type="submit" className="btn-gold w-full" disabled={busy}>
            {busy
              ? t('auth.working')
              : mode === 'in'
                ? t('auth.sign_in')
                : t('auth.sign_up')}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError('');
            setNotice('');
          }}
          className="mt-4 w-full text-center text-sm text-gold-400 hover:underline"
        >
          {mode === 'in' ? t('auth.no_account') : t('auth.have_account')}
        </button>
      </div>
    </div>
  );
}

function friendlyError(err: unknown, t: (k: string) => string): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('already') || msg.includes('registered')) return t('auth.err_exists');
  if (msg.includes('invalid') || msg.includes('credentials')) return t('auth.err_invalid');
  if (msg.includes('password') || msg.includes('6 characters')) return t('auth.err_weak');
  return t('auth.err_generic');
}
