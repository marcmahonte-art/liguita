import { redirect } from 'next/navigation';

/**
 * Ancienne page « Mes annonces », repliée sur « Mes avis de recherche ».
 *
 * Les deux pages listaient les mêmes recherches enregistrées : même donnée, même
 * mutation, libellé différent. « Avis de recherche » reste l'adresse canonique — c'est
 * celle que les actions serveur revalident déjà.
 *
 * La route reste alive pour les liens existants ; voir `app/app/avis/page.tsx`.
 */
export default function AnnoncesRedirect() {
  redirect('/app/avis');
}
