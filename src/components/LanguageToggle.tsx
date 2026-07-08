import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

/** English / Arabic toggle. Persists choice and flips document direction. */
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  return (
    <div
      className={`inline-flex rounded-full border border-overlay/10 bg-overlay/5 p-0.5 ${
        compact ? 'text-xs' : 'text-sm'
      }`}
      role="group"
      aria-label="Language"
    >
      {(['en', 'ar'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLanguage(l)}
          className={`rounded-full px-3 py-1 font-semibold transition-colors ${
            lang === l
              ? 'bg-gold text-navy-950'
              : 'text-fg hover:text-fg'
          }`}
          aria-pressed={lang === l}
        >
          {l === 'en' ? 'EN' : 'ع'}
        </button>
      ))}
    </div>
  );
}
