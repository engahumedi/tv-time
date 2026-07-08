import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}

/** Friendly empty state — left-aligned and offset, editorial rather than centered. */
export function EmptyState({ icon, title, body, children }: EmptyStateProps) {
  return (
    <div className="max-w-md py-14 text-start animate-fade-up">
      <div className="mb-5 inline-grid h-12 w-12 place-items-center rounded-lg border border-overlay/[0.08] text-gold">
        {icon}
      </div>
      <h2 className="mb-2 font-display text-2xl font-semibold text-fg">{title}</h2>
      {body && (
        <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      )}
      {children}
    </div>
  );
}
