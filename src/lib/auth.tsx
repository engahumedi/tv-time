import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, hasSupabase, functionsBase, supabaseAnonKey } from './supabase';
import { setCloudUser, syncAfterLogin } from './cloud';
import { clearAll } from './repo';

interface AuthState {
  /** True when Supabase is configured (login is available). */
  enabled: boolean;
  /** False until the initial session check completes. */
  ready: boolean;
  user: User | null;
  /** True while a full sync is running after sign-in. */
  syncing: boolean;
  /** True while completing a password-reset (recovery) link. */
  recovery: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
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

  // De-duped sync so a returning session and a fresh SIGNED_IN don't run it twice.
  const syncingRef = useRef(false);
  async function runSync() {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      await syncAfterLogin();
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user ?? null;
      setUser(u);
      setCloudUser(u?.id ?? null);
      setReady(true);
      // Existing session on app open: pull the account's latest data down so
      // watches/shows added on another device (or session) show up here.
      // Without this, sync only ran on a fresh SIGNED_IN and returning users
      // saw stale local data (e.g. imported episodes appearing unwatched).
      if (u) void runSync();
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setCloudUser(u?.id ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      // Merge local <-> cloud when a real session becomes active.
      if (u && event === 'SIGNED_IN') void runSync();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signUp(email: string, password: string) {
    if (!supabase) throw new Error('auth-unavailable');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('auth-unavailable');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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

  async function deleteAccount() {
    if (!supabase) throw new Error('auth-unavailable');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const base = functionsBase();
    if (!token || !base) throw new Error('no-session');
    const res = await fetch(`${base}/api/account`, {
      method: 'DELETE',
      headers: { apikey: supabaseAnonKey ?? '', Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('delete-failed');
    // Wipe the local mirror, then end the session.
    await clearAll();
    await supabase.auth.signOut();
    setCloudUser(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        enabled: hasSupabase,
        ready,
        user,
        syncing,
        recovery,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        sendPasswordReset,
        updatePassword,
        deleteAccount,
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
