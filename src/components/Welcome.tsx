import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { AuthForm } from './AuthForm';
import { LanguageToggle } from './LanguageToggle';
import { Logo } from './Sidebar';

/** First-run onboarding: brand + auth, shown before the user is signed in. */
export function Welcome() {
  const { t } = useTranslation();
  const { continueAsGuest } = useAuth();

  const features = [
    { icon: '✓', text: t('auth.feature_track') },
    { icon: '📊', text: t('auth.feature_stats') },
    { icon: '☁️', text: t('auth.feature_sync') },
  ];

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 15% 0%, rgba(255,91,69,0.18), transparent 60%),' +
            'radial-gradient(50% 40% at 100% 100%, rgba(255,91,69,0.10), transparent 60%)',
        }}
      />

      <div className="absolute end-4 top-4 z-10">
        <LanguageToggle compact />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-5xl flex-col items-center justify-center gap-10 px-6 py-16 lg:flex-row lg:gap-16">
        {/* Brand / pitch */}
        <div className="w-full max-w-md text-center lg:text-start">
          <div className="mb-6 flex items-center justify-center gap-3 lg:justify-start">
            <Logo />
            <span className="text-2xl font-extrabold tracking-tight">
              {t('app.name')}
            </span>
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.1] lg:text-5xl">
            {t('auth.welcome_title')}
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base text-muted lg:mx-0">
            {t('auth.welcome_sub')}
          </p>
          <ul className="mx-auto mt-6 inline-flex flex-col gap-2.5 text-start lg:mx-0">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-fg">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/15 text-gold-400">
                  {f.icon}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Auth card */}
        <div className="w-full max-w-sm">
          <div className="card p-6 shadow-lift">
            <AuthForm initialMode="up" />
          </div>
          <button
            onClick={continueAsGuest}
            className="mt-4 w-full text-center text-sm text-faint hover:text-fg"
          >
            {t('auth.explore_guest')}
          </button>
        </div>
      </div>
    </div>
  );
}
