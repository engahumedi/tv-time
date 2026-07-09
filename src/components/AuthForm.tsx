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
  const { signIn, signUp, signInWithGoogle, sendPasswordReset } = useAuth();
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

  async function google() {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle(); // redirects away on success
    } catch (err) {
      setError(friendlyError(err, t));
      setBusy(false);
    }
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
                mode === m ? 'bg-gold text-navy-950' : 'text-muted'
              }`}
            >
              {m === 'in' ? t('auth.sign_in') : t('auth.sign_up')}
            </button>
          ))}
        </div>
      )}

      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>

      {mode !== 'forgot' && (
        <>
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="btn-ghost mt-5 w-full"
          >
            <GoogleIcon />
            {t('auth.continue_google')}
          </button>
          <div className="my-4 flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-overlay/[0.1]" />
            {t('auth.or')}
            <span className="h-px flex-1 bg-overlay/[0.1]" />
          </div>
        </>
      )}

      <form onSubmit={submit} className={mode === 'forgot' ? 'mt-5 space-y-3' : 'space-y-3'}>
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
                  className="text-xs text-gold hover:underline"
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
          className="mt-4 w-full text-center text-sm text-gold hover:underline"
        >
          {t('auth.back_to_signin')}
        </button>
      )}
    </div>
  );
}

/** The Google "G" brand mark (multicolour) for the sign-in button. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2 1.5-4.7 2.5-7.6 2.5-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.5 5.5c-.5.4 6.3-4.6 6.3-15 0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function friendlyError(err: unknown, t: (k: string) => string): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('already') || msg.includes('registered')) return t('auth.err_exists');
  if (msg.includes('invalid') || msg.includes('credentials')) return t('auth.err_invalid');
  if (msg.includes('password') || msg.includes('6 characters')) return t('auth.err_weak');
  return t('auth.err_generic');
}
