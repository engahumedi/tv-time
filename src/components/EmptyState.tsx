import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}

/** Friendly empty state that tells the user what to do next. */
export function EmptyState({ icon, title, body, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center animate-fade-up">
      <div className="mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-gold/10 text-4xl text-gold-400">
        {icon}
      </div>
      <h2 className="mb-2 text-xl font-bold text-slate-100">{title}</h2>
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-slate-400">
        {body}
      </p>
      {children}
    </div>
  );
}
