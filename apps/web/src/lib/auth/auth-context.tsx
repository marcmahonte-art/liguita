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
import { resolveIdentity, type Identity } from './identity';

/**
 * Profil métier lu dans la table `profiles`.
 * Champs alignés sur les migrations `20260923000500` et `20260923003100`.
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
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  /** `EMAIL`, `GOOGLE` ou `PHONE`. Jamais modifiable par l'utilisateur. */
  auth_provider: string;
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

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Facultatif : destination des retraits, complétable plus tard sur le profil. */
  airtelNumber?: string;
}

interface AuthContextValue {
  /** Ligne de `profiles`. `null` si personne n'est connecté. */
  user: AuthProfile | null;
  /**
   * Identité affichable, dérivée de `user`.
   *
   * ⚠️ C'est **cette** valeur que les composants doivent afficher. Elle passe par
   * `resolveIdentity`, qui applique l'ordre de repli « nom → prénom → email →
   * téléphone ». Lire `user.display_name` ou `user.phone` directement dans un
   * composant, c'est reintroduire le bug que cette couche élimine.
   */
  identity: Identity | null;
  session: Session | null;
  isLoading: boolean;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    input: SignUpInput,
  ) => Promise<{ error: string | null; requiresConfirmation: boolean }>;
  /** Recharge le profil — après une édition, ou après le retour de Google. */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Route qui échange le code OAuth contre une session. */
const OAUTH_CALLBACK_PATH = '/auth/callback';

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(
    async (userId: string) => {
      /* Le déclencheur `handle_new_user` crée la ligne dans la transaction
         d'inscription. Le client peut toutefois l'interroger une fraction de seconde
         avant : on réessaie une fois plutôt que d'afficher « Mon compte » à un
         utilisateur qui vient de s'inscrire. */
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (data) {
          setUser(data as AuthProfile);
          return;
        }
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
      setUser(null);
    },
    [supabase],
  );

  const refreshProfile = useCallback(async () => {
    const {
      data: { user: current },
    } = await supabase.auth.getUser();
    if (current) await loadProfile(current.id);
  }, [supabase, loadProfile]);

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
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (cancelled) return;
      setSession(next);
      if (next?.user) {
        /* ⚠️ Différé d'un tick : interroger Supabase *à l'intérieur* de
           `onAuthStateChange` peut s'interbloquer avec le verrou interne du client.
           Le rappel lui-même est synchrone, le rechargement ne l'est pas. */
        const userId = next.user.id;
        setTimeout(() => {
          if (!cancelled) void loadProfile(userId);
        }, 0);
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

  const signInWithGoogle = useCallback(
    async (redirectTo = '/app') => {
      /* Le chemin de retour est transmis dans l'URL de rappel, jamais dans un
         paramètre du fournisseur : Google n'accepterait pas une URL arbitraire. Il
         est revalidé côté serveur avant toute redirection. */
      const callback = new URL(OAUTH_CALLBACK_PATH, window.location.origin);
      callback.searchParams.set('redirect', redirectTo);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.toString() },
      });
      return { error: error?.message ?? null };
    },
    [supabase],
  );

  const signUpWithPassword = useCallback(
    async ({ email, password, firstName, lastName, airtelNumber }: SignUpInput) => {
      const airtelDigits = (airtelNumber ?? '').replace(/\D/g, '');
      if (
        firstName.trim().length < 1 ||
        lastName.trim().length < 1 ||
        password.length < 8 ||
        !/^\S+@\S+\.\S+$/.test(email.trim())
      ) {
        return {
          error: 'Prénom, nom, email et mot de passe (8 caractères minimum) sont requis.',
          requiresConfirmation: false,
        };
      }
      if (airtelNumber && airtelNumber.trim() !== '' && airtelDigits.length < 8) {
        return { error: 'Le numéro Airtel Money saisi est incomplet.', requiresConfirmation: false };
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          /* Le déclencheur `apply_user_identity` lit ces clés. Les conventions de
             Google (`given_name`, `family_name`, `full_name`, `picture`) sont aussi
             acceptées, pour qu'une même fonction serve les deux chemins. */
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
            ...(airtelNumber?.trim()
              ? { airtel_number: airtelNumber.trim() }
              : {}),
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

  const identity = useMemo(() => (user ? resolveIdentity(user) : null), [user]);

  const value = useMemo(
    () => ({
      user,
      identity,
      session,
      isLoading,
      signInWithPassword,
      signInWithGoogle,
      signUpWithPassword,
      refreshProfile,
      signOut,
    }),
    [
      user,
      identity,
      session,
      isLoading,
      signInWithPassword,
      signInWithGoogle,
      signUpWithPassword,
      refreshProfile,
      signOut,
    ],
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
