'use server';

import { findCity } from '@liguita/config';

import { resolveIdentity } from '../../lib/auth/identity';
import { createClient } from '../../lib/supabase/server';

/**
 * Normalisation d'un numéro de téléphone.
 *
 * On retire espaces, points, tirets et parenthèses, puis on conserve l'indicatif
 * s'il est présent. Le reste est comparé à un motif strict : pas de lettres, pas de
 * `+` au milieu, longueur bornée.
 */
function normalizePhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (compact === '') return '';
  if (!/^\+?[0-9]{8,15}$/.test(compact)) return null;
  return compact;
}

export async function updateAirtelNumber(
  airtelNumber: string,
): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizePhone(airtelNumber);
  if (normalized === null) {
    return { ok: false, error: 'Saisissez un numéro Airtel Money valide.' };
  }
  if (normalized === '') {
    return { ok: false, error: 'Saisissez un numéro Airtel Money.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { error } = await supabase
    .from('profiles')
    .update({ airtel_number: normalized, airtel_verified: false })
    .eq('id', user.id);
  if (error) return { ok: false, error: 'Enregistrement impossible. Réessayez.' };
  return { ok: true };
}

/**
 * Met à jour l'identité affichable : prénom, nom et numéro de téléphone.
 *
 * ⚠️ `display_name` est recalculé **ici**, avec `resolveIdentity`, plutôt que dans la
 * requête SQL. C'est le même module que celui qui lit `display_name` à l'affichage :
 * impossible donc que la valeur enregistrée et la valeur affichée divergent.
 *
 * `auth_provider` n'est pas modifiable : c'est la méthode de connexion réelle, elle se
 * déduit de la session et ne se déclare pas dans un formulaire. Aucune information
 * technique d'authentification n'est acceptée ici.
 */
export async function updateIdentity(input: {
  firstName: string;
  lastName: string;
  phone: string;
}): Promise<{ ok: boolean; error?: string }> {
  const firstName = input.firstName.trim().replace(/\s+/g, ' ');
  const lastName = input.lastName.trim().replace(/\s+/g, ' ');

  if (firstName.length < 1) {
    return { ok: false, error: 'Indiquez votre prénom.' };
  }
  if (firstName.length > 60 || lastName.length > 60) {
    return { ok: false, error: 'Prénom ou nom trop long (60 caractères maximum).' };
  }
  /* Un nom se saisit en lettres, espaces, tirets et apostrophes. Autoriser n'importe
     quoi ici reviendrait à laisser l'utilisateur écrire son adresse email ou un script
     dans un champ qui alimente des menus et des Discussions. */
  if (!/^[\p{L}\p{M}'’ -]+$/u.test(firstName) || !/^[\p{L}\p{M}'’ -]*$/u.test(lastName)) {
    return { ok: false, error: 'Prénom et nom ne peuvent contenir que des lettres.' };
  }

  const phone = normalizePhone(input.phone);
  if (phone === null) {
    return { ok: false, error: 'Saisissez un numéro de téléphone valide, ou laissez le champ vide.' };
  }

  const displayName = resolveIdentity({ first_name: firstName, last_name: lastName }).displayName;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName || null,
      full_name: displayName,
      display_name: displayName,
      phone,
    })
    .eq('id', user.id);
  if (error) return { ok: false, error: 'Enregistrement impossible. Réessayez.' };
  return { ok: true };
}

/**
 * Préférences du compte — ce qui n'est **pas** de l'identité.
 *
 * Ville, langue et statut de « samaritain » vivent ici, et nowhere ailleurs.
 * `city_slug` et `locale` sont validés contre le référentiel plutôt que contre une
 * chaîne libre : ces deux colonnes alimentent des URL et un ciblage d'alertes, et une
 * valeur inventée y casserait des liens.
 */
export async function updatePreferences(input: {
  citySlug: string;
  locale: string;
  isSamaritan: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const citySlug = input.citySlug.trim();
  const city = findCity(citySlug);
  if (!city || !city.isActive) {
    return { ok: false, error: 'Ville inconnue ou indisponible.' };
  }
  if (!['fr', 'ar'].includes(input.locale)) {
    return { ok: false, error: 'Langue non prise en charge.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté' };

  const { error } = await supabase
    .from('profiles')
    .update({ city_slug: citySlug, locale: input.locale, is_samaritan: input.isSamaritan })
    .eq('id', user.id);
  if (error) return { ok: false, error: 'Enregistrement impossible. Réessayez.' };
  return { ok: true };
}
