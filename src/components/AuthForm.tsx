import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';

export type AuthMode = 'in' | 'up' | 'forgot';

/** The email/password form shared by the welcome screen and the in-app sheet. */
export function AuthForm({
  initialMode = 'in',
  onSignedIn,
}: {
  initialMode?: AuthMode;
  onSignedIn?: () => void;
}) {
  const { t } = useTranslation();
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function switchMode(m: AuthMode) {
    setMode(m);
    setError('');
    setNotice('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await sendPasswordReset(email.trim());
        setNotice(t('auth.reset_sent'));
      } else if (mode === 'up') {
        await signUp(email.trim(), password);
        onSignedIn?.();
      } else {
        await signIn(email.trim(), password);
        onSignedIn?.();
      }
    } catch (err) {
      setError(friendlyError(err, t));
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === 'forgot'
      ? t('auth.forgot_title')
      : mode === 'up'
        ? t('auth.sign_up')
        : t('auth.sign_in');
  const subtitle =
    mode === 'forgot' ? t('auth.forgot_sub') : t('auth.sync_blurb');
  const submitLabel = busy
    ? t('auth.working')
    : mode === 'forgot'
      ? t('auth.send_reset')
      : mode === 'up'
        ? t('auth.sign_up')
        : t('auth.sign_in');

  return (
    <div>
      {/* Tabs (hidden in forgot mode) */}
      {mode !== 'forgot' && (
        <div className="mb-5 grid grid-cols-2 rounded-xl border border-overlay/[0.08] bg-navy-700/60 p-1">
          {(['in', 'up'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-gold text-white shadow-gold' : 'text-muted'
              }`}
            >
              {m === 'in' ? t('auth.sign_in') : t('auth.sign_up')}
            </button>
          ))}
        </div>
      )}

      <h2 className="text-2xl font-extrabold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">
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

        {mode !== 'forgot' && (
          <label className="block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">
                {t('auth.password')}
              </span>
              {mode === 'in' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-gold-400 hover:underline"
                >
                  {t('auth.forgot')}
                </button>
              )}
            </div>
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
        )}

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
          {submitLabel}
        </button>
      </form>

      {mode === 'forgot' && (
        <button
          onClick={() => switchMode('in')}
          className="mt-4 w-full text-center text-sm text-gold-400 hover:underline"
        >
          {t('auth.back_to_signin')}
        </button>
      )}
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
