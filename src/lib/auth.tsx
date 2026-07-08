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

interface AuthState {
  /** True when Supabase is configured (login is available). */
  enabled: boolean;
  /** False until the initial session check completes. */
  ready: boolean;
  user: User | null;
  /** True while a full sync is running after sign-in. */
  syncing: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!hasSupabase);
  const [syncing, setSyncing] = useState(false);

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
      // Merge local <-> cloud when a session becomes active.
      if (u && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
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
  }

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error('auth-unavailable');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCloudUser(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ enabled: hasSupabase, ready, user, syncing, signUp, signIn, signOut }}
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
