import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Globe, Camera } from 'lucide-react';
import { getTheme, setTheme, getDisplayName, setDisplayName, type Theme } from '../lib/settings';
import { LanguageToggle } from '../components/LanguageToggle';
import { AccountCard } from '../components/AccountCard';
import { exportData, exportWatchesCsv, triggerDownload } from '../lib/exporter';
import { clearAll } from '../lib/repo';
import { getMyProfile, saveMyProfile, normalizeUsername, uploadAvatar } from '../lib/social';
import { Avatar } from './People';
import { useAuth } from '../lib/auth';

export function Settings() {
  const { t } = useTranslation();
  const { user, updatePassword } = useAuth();
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [name, setName] = useState(getDisplayName());
  const [savedName, setSavedName] = useState(false);

  // Public profile (username + public/private), loaded when signed in.
  const [username, setUsername] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [profErr, setProfErr] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getMyProfile()
      .then((p) => {
        if (!p) return;
        setUsername(p.username);
        setIsPublic(p.isPublic);
        setName((n) => n || p.displayName);
        setAvatarUrl(p.avatarUrl ?? null);
      })
      .catch(() => {});
  }, [user]);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfErr(t('settings.avatar_too_big'));
      return;
    }
    setProfErr('');
    setAvatarBusy(true);
    const res = await uploadAvatar(file);
    setAvatarBusy(false);
    if (res.error) setProfErr(t('settings.avatar_error'));
    else if (res.url) setAvatarUrl(res.url);
  }

  // Change-password form (only when signed in).
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  function chooseTheme(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  async function saveProfile() {
    setProfErr('');
    setDisplayName(name);
    if (user) {
      const uname = normalizeUsername(username);
      const res = await saveMyProfile({ username: uname, displayName: name, isPublic });
      if (res.error) {
        setProfErr(t(`settings.username_${res.error}`));
        return;
      }
      setUsername(uname);
    }
    setSavedName(true);
    setTimeout(() => setSavedName(false), 1500);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwErr('');
    setPwMsg('');
    if (pw.length < 6) {
      setPwErr(t('auth.err_weak'));
      return;
    }
    if (pw !== pw2) {
      setPwErr(t('auth.passwords_mismatch'));
      return;
    }
    setPwBusy(true);
    try {
      await updatePassword(pw);
      setPwMsg(t('settings.password_saved'));
      setPw('');
      setPw2('');
    } catch {
      setPwErr(t('auth.err_generic'));
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-2">
      <h1 className="text-3xl font-bold lg:text-4xl">{t('settings.title')}</h1>

      {/* Account */}
      <AccountCard />

      {/* Appearance */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          {t('settings.appearance')}
        </h2>
        <div className="flex items-center justify-between py-1.5">
          <span className="font-semibold">{t('settings.theme')}</span>
          <div className="inline-flex rounded-full border border-overlay/10 bg-navy-700 p-0.5">
            {(['dark', 'light'] as const).map((tm) => (
              <button
                key={tm}
                onClick={() => chooseTheme(tm)}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                  theme === tm ? 'bg-gold text-navy-950' : 'text-muted'
                }`}
              >
                {t(`settings.${tm}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-overlay/[0.06] py-3">
          <span className="font-semibold">{t('settings.language')}</span>
          <LanguageToggle />
        </div>
      </section>

      {/* Profile */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          {t('settings.profile')}
        </h2>
        <label className="block text-sm font-semibold">{t('settings.display_name')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('settings.display_name_ph')}
          className="input mt-1.5"
        />

        {user && (
          <>
            {/* Avatar */}
            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                className="group relative shrink-0 rounded-full"
                aria-label={t('settings.change_avatar')}
              >
                <Avatar name={name} url={avatarUrl} size={64} />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-navy-950/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera size={20} strokeWidth={1.75} className="text-fg" />
                </span>
              </button>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={avatarBusy} className="btn-ghost text-sm">
                  {avatarBusy ? t('auth.working') : t('settings.change_avatar')}
                </button>
                <p className="mt-1 text-xs text-faint">{t('settings.avatar_hint')}</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
            </div>

            <label className="mt-4 block text-sm font-semibold">{t('settings.username')}</label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-muted">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                placeholder="username"
                className="input flex-1"
                dir="ltr"
                maxLength={20}
              />
            </div>
            <p className="mt-1 text-xs text-faint">{t('settings.username_hint')}</p>

            {/* Privacy */}
            <div className="mt-4 border-t border-overlay/[0.06] pt-4">
              <p className="mb-2 text-sm font-semibold">{t('settings.privacy')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-start text-sm ${!isPublic ? 'border-gold/60 bg-gold/[0.08] text-gold' : 'border-overlay/10 text-muted'}`}
                >
                  <Lock size={16} strokeWidth={1.9} />
                  <span><span className="block font-semibold">{t('settings.private')}</span><span className="text-[11px] text-faint">{t('settings.private_hint')}</span></span>
                </button>
                <button
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-start text-sm ${isPublic ? 'border-gold/60 bg-gold/[0.08] text-gold' : 'border-overlay/10 text-muted'}`}
                >
                  <Globe size={16} strokeWidth={1.9} />
                  <span><span className="block font-semibold">{t('settings.public')}</span><span className="text-[11px] text-faint">{t('settings.public_hint')}</span></span>
                </button>
              </div>
            </div>
          </>
        )}

        {profErr && <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{profErr}</p>}

        <button className="btn-gold mt-4 text-sm" onClick={saveProfile}>
          {savedName ? t('settings.saved') : t('settings.save')}
        </button>
      </section>

      {/* Change password (signed-in users only) */}
      {user && (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            {t('settings.password')}
          </h2>
          <form onSubmit={changePassword} className="space-y-3">
            <input
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={t('auth.new_password')}
              className="input"
              dir="ltr"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder={t('auth.confirm_password')}
              className="input"
              dir="ltr"
            />
            {pwErr && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{pwErr}</p>
            )}
            {pwMsg && (
              <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{pwMsg}</p>
            )}
            <button type="submit" className="btn-gold text-sm" disabled={pwBusy}>
              {pwBusy ? t('auth.working') : t('settings.change_password')}
            </button>
          </form>
        </section>
      )}

      {/* Data */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          {t('settings.data')}
        </h2>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <div className="min-w-0">
            <p className="font-semibold">{t('settings.import_title')}</p>
            <p className="text-xs text-muted">{t('settings.import_desc')}</p>
          </div>
          <Link to="/import" className="btn-ghost shrink-0 text-sm">
            {t('settings.import_cta')}
          </Link>
        </div>
        <ol className="mt-3 space-y-2 border-t border-overlay/[0.06] pt-3 text-sm text-muted">
          {(t('settings.import_steps', { returnObjects: true }) as string[]).map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15 text-[11px] font-bold text-gold">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2 border-t border-overlay/[0.06] pt-3">
          <span className="me-auto font-semibold">{t('settings.export_title')}</span>
          <button
            className="btn-ghost text-sm"
            onClick={async () => triggerDownload(await exportData(), 'showtrack-backup.json')}
          >
            JSON
          </button>
          <button
            className="btn-ghost text-sm"
            onClick={async () => triggerDownload(await exportWatchesCsv(), 'showtrack-history.csv')}
          >
            CSV
          </button>
        </div>
      </section>

      {/* Danger */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-rose-300/80">
          {t('settings.danger')}
        </h2>
        <button
          className="btn w-full border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
          onClick={async () => {
            if (confirm(t('settings.reset_confirm'))) await clearAll();
          }}
        >
          {t('settings.reset')}
        </button>
      </section>
    </div>
  );
}
