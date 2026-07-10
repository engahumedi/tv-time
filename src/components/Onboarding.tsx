import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Compass, Users, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

const FLAG = 'showtrack:onboarded';

/** Has the user already seen the first-run intro? */
export function hasOnboarded(): boolean {
  try { return localStorage.getItem(FLAG) === '1'; } catch { return true; }
}
function markOnboarded() {
  try { localStorage.setItem(FLAG, '1'); } catch { /* ignore */ }
}

const SLIDES: { icon: ComponentType<LucideProps>; key: string }[] = [
  { icon: Tv, key: 'track' },
  { icon: Compass, key: 'discover' },
  { icon: Users, key: 'social' },
];

/** A tiny 3-slide welcome shown once on first run. */
export function Onboarding({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  function finish() {
    markOnboarded();
    onClose();
  }

  const Slide = SLIDES[i];
  const Icon = Slide.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-950/85 backdrop-blur-sm sm:items-center">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-strong w-full max-w-sm rounded-t-3xl p-6 text-center sm:rounded-3xl"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={Slide.key}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Icon size={30} strokeWidth={1.6} />
            </div>
            <h2 className="mt-4 text-xl font-bold">{t(`onboarding.${Slide.key}_title`)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t(`onboarding.${Slide.key}_body`)}</p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="mt-6 flex justify-center gap-1.5">
          {SLIDES.map((s, idx) => (
            <span key={s.key} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-gold' : 'w-1.5 bg-overlay/20'}`} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={finish} className="text-sm text-muted hover:text-fg">
            {t('onboarding.skip')}
          </button>
          <button onClick={() => (last ? finish() : setI((n) => n + 1))} className="btn-gold text-sm">
            {last ? t('onboarding.done') : t('onboarding.next')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
