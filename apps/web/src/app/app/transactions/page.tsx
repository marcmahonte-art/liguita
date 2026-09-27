import { redirect } from 'next/navigation';

/**
 * Ancienne page « Mes transactions », absorbée par « Récompenses ».
 *
 * On ne supprime pas la route : elle reste dans les signets, dans les liens envoyés par
 * e-mail et dans les historiques de messagerie. Une redirection est le moyen de dire
 * « cette information a changé d'adresse » sans punir celui qui clique sur un ancien
 * lien. Voir `app/app/portefeuille/page.tsx`.
 */
export default function TransactionsRedirect() {
  redirect('/app/portefeuille');
}
