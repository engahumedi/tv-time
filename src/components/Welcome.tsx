import { useTranslation } from 'react-i18next';
import { Check, BarChart3, Cloud } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { AuthForm } from './AuthForm';
import { LanguageToggle } from './LanguageToggle';
import { Logo } from './Sidebar';

/** First-run onboarding: brand + auth, shown before the user is signed in. */
export function Welcome() {
  const { t } = useTranslation();
  const { continueAsGuest } = useAuth();

  const features = [
    { Icon: Check, text: t('auth.feature_track') },
    { Icon: BarChart3, text: t('auth.feature_stats') },
    { Icon: Cloud, text: t('auth.feature_sync') },
  ];

  return (
    <div className="relative min-h-full">
      {/* Whisper of warmth, top-left — editorial, not glowy. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 55% at 0% 0%, rgba(201,162,75,0.06), transparent 60%)',
        }}
      />

      <div className="absolute end-4 top-4 z-10">
        <LanguageToggle compact />
      </div>

      <div className="relative mx-auto grid min-h-full max-w-5xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-20">
        {/* Brand / pitch — left-aligned magazine cover */}
        <div className="w-full max-w-lg text-start">
          <div className="mb-8 flex items-center gap-3">
            <Logo />
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
              {t('app.name')}
            </span>
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] lg:text-6xl">
            {t('auth.welcome_title')}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            {t('auth.welcome_sub')}
          </p>
          <ul className="mt-8 flex flex-col gap-4 border-t border-overlay/[0.08] pt-8">
            {features.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-fg">
                <Icon size={17} strokeWidth={1.75} className="shrink-0 text-gold" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Auth */}
        <div className="w-full max-w-sm justify-self-start lg:justify-self-end">
          <div className="rounded-xl border border-overlay/[0.08] bg-navy-800 p-6">
            <AuthForm initialMode="up" />
          </div>
          <button
            onClick={continueAsGuest}
            className="mt-4 w-full text-start text-sm text-faint hover:text-fg"
          >
            {t('auth.explore_guest')}
          </button>
        </div>
      </div>
    </div>
  );
}
