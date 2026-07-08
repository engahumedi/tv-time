import { AuthForm } from './AuthForm';

/** In-app sign-in sheet (used by the Profile account panel for guests). */
export function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass-strong w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <AuthForm initialMode="in" onSignedIn={onClose} />
      </div>
    </div>
  );
}
