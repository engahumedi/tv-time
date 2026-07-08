import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTheme, setTheme, getDisplayName, setDisplayName, type Theme } from '../lib/settings';
import { LanguageToggle } from '../components/LanguageToggle';
import { AccountCard } from '../components/AccountCard';
import { exportData, exportWatchesCsv, triggerDownload } from '../lib/exporter';
import { clearAll } from '../lib/repo';

export function Settings() {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [name, setName] = useState(getDisplayName());
  const [savedName, setSavedName] = useState(false);

  function chooseTheme(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  function saveName() {
    setDisplayName(name);
    setSavedName(true);
    setTimeout(() => setSavedName(false), 1500);
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
        <div className="mt-1.5 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('settings.display_name_ph')}
            className="input flex-1"
          />
          <button className="btn-gold shrink-0 text-sm" onClick={saveName}>
            {savedName ? t('settings.saved') : t('settings.save')}
          </button>
        </div>
      </section>

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
