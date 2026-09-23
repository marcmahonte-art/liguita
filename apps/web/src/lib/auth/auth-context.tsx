'use client';

import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { createClient } from '../supabase/client';

/**
 * Profil métier lu dans la table `profiles`.
 * Champs alignés sur la migration `20260923000500_profiles.sql`.
 */
export interface AuthProfile {
  id: string;
  phone: string;
  phone_verified: boolean;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string;
  city_slug: string | null;
  locale: string;
  app_role: string;
  trust_score: number;
  is_samaritan: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: AuthProfile | null;
  session: Session | null;
  isLoading: boolean;
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Normalise une saisie tchadienne en format E.164 `+235XXXXXXXX`. */
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('235')) return `+${digits}`;
  return `+235${digits}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setUser((data as AuthProfile | null) ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      if (cancelled) return;
      setSession(initial);
      if (initial?.user) {
        await loadProfile(initial.user.id);
      }
      if (!cancelled) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (cancelled) return;
      setSession(next);
      if (next?.user) {
        await loadProfile(next.user.id);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signInWithPhone = useCallback(
    async (phone: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        phone: toE164(phone),
        options: { channel: 'sms' },
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const verifyOtp = useCallback(
    async (phone: string, token: string) => {
      const { error } = await supabase.auth.verifyOtp({
        phone: toE164(phone),
        token,
        type: 'sms',
      });
      if (!error) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) await loadProfile(authUser.id);
      }
      return { error: error?.message ?? null };
    },
    [supabase, loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [supabase]);

  const value = useMemo(
    () => ({ user, session, isLoading, signInWithPhone, verifyOtp, signOut }),
    [user, session, isLoading, signInWithPhone, verifyOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Accès au contexte d'authentification.
 *
 * Jeton d'erreur explicite : un appel hors `<AuthProvider>` est une erreur de
 * développement, pas un état à gérer silencieusement.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  }
  return context;
}
