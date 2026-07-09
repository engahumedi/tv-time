import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, hasSupabase } from './supabase';
import { setCloudUser, syncAfterLogin } from './cloud';

const GUEST_KEY = 'showtrack:guest';

interface AuthState {
  /** True when Supabase is configured (login is available). */
  enabled: boolean;
  /** False until the initial session check completes. */
  ready: boolean;
  user: User | null;
  /** True while a full sync is running after sign-in. */
  syncing: boolean;
  /** The user chose to explore without an account. */
  guest: boolean;
  /** True while completing a password-reset (recovery) link. */
  recovery: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Where Supabase should send the user back after a reset-password email. */
function resetRedirect(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!hasSupabase);
  const [syncing, setSyncing] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [guest, setGuest] = useState<boolean>(
    () => localStorage.getItem(GUEST_KEY) === '1',
  );

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user ?? null;
      setUser(u);
      setCloudUser(u?.id ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setCloudUser(u?.id ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      // Merge local <-> cloud when a real session becomes active.
      if (u && event === 'SIGNED_IN') {
        setSyncing(true);
        try {
          await syncAfterLogin();
        } finally {
          setSyncing(false);
        }
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error('auth-unavailable');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    clearGuest();
  }

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('auth-unavailable');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    clearGuest();
  }

  async function signInWithGoogle() {
    if (!supabase) throw new Error('auth-unavailable');
    // Redirect back to the app; Supabase completes the session on return and
    // onAuthStateChange(SIGNED_IN) then runs the local↔cloud sync.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: resetRedirect() },
    });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCloudUser(null);
    setUser(null);
  }

  function continueAsGuest() {
    localStorage.setItem(GUEST_KEY, '1');
    setGuest(true);
  }

  function clearGuest() {
    localStorage.removeItem(GUEST_KEY);
    setGuest(false);
  }

  async function sendPasswordReset(email: string) {
    if (!supabase) throw new Error('auth-unavailable');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetRedirect(),
    });
    if (error) throw error;
  }

  async function updatePassword(password: string) {
    if (!supabase) throw new Error('auth-unavailable');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setRecovery(false);
  }

  return (
    <AuthContext.Provider
      value={{
        enabled: hasSupabase,
        ready,
        user,
        syncing,
        guest,
        recovery,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        continueAsGuest,
        sendPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
