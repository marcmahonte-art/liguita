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
  email: string | null;
  email_verified: boolean;
  phone: string;
  phone_verified: boolean;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  airtel_number: string | null;
  airtel_verified: boolean;
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
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUpWithPassword: (input: {
    email: string;
    password: string;
    fullName: string;
    whatsappNumber: string;
    airtelNumber: string;
  }) => Promise<{ error: string | null; requiresConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signUpWithPassword = useCallback(
    async (input: {
      email: string;
      password: string;
      fullName: string;
      whatsappNumber: string;
      airtelNumber: string;
    }) => {
      const whatsappDigits = input.whatsappNumber.replace(/\D/g, '');
      const airtelDigits = input.airtelNumber.replace(/\D/g, '');
      if (
        input.fullName.trim().length < 2 ||
        input.password.length < 8 ||
        whatsappDigits.length < 8 ||
        airtelDigits.length < 8
      ) {
        return { error: 'Nom, mot de passe et deux numéros valides sont requis.', requiresConfirmation: false };
      }
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            whatsapp_number: input.whatsappNumber.trim(),
            airtel_number: input.airtelNumber.trim(),
          },
        },
      });
      if (error) return { error: error.message, requiresConfirmation: false };
      if (!data.session && data.user) {
        return { error: null, requiresConfirmation: true };
      }
      if (data.user) await loadProfile(data.user.id);
      return { error: null, requiresConfirmation: false };
    },
    [supabase, loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [supabase]);

  const value = useMemo(
    () => ({ user, session, isLoading, signInWithPassword, signUpWithPassword, signOut }),
    [user, session, isLoading, signInWithPassword, signUpWithPassword, signOut],
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
