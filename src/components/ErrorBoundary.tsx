import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Catches render-time crashes so a single broken component shows a recovery
 * card instead of blanking the whole app.
 *
 * React only routes errors to class components, hence no hooks here. Strings
 * are hard-coded rather than translated: i18n itself could be what failed.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the details in the console for debugging; nothing is sent anywhere.
    console.error('Render error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg border border-overlay/[0.08] text-gold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold">Something went wrong</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Your data is safe — it&apos;s stored on this device and in your account. Reloading
          usually fixes it.
        </p>
        <button className="btn-gold mt-5" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
