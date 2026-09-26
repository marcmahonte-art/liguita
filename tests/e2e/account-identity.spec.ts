import { expect, test } from '@playwright/test';

const email = process.env.LIGUITA_E2E_EMAIL;
const password = process.env.LIGUITA_E2E_PASSWORD;

/**
 * Identité affichée — régression sur le défaut que la refonte corrige.
 *
 * Avant, l'en-tête et le menu utilisateur affichaient le **numéro de téléphone**, faute
 * de nom : `profiles.full_name` n'était jamais renseigné, et la fonction de repli
 * aboutissait au numéro. Ce test verrouille l'inverse : l'en-tête porte un nom, le
 * numéro n'apparaît qu'à l'intérieur du menu.
 *
 * Le nom attendu vient de `LIGUITA_E2E_DISPLAY_NAME` : la valeur dépend de la base, on
 * ne peut donc pas la deviner dans le test.
 */
test('le menu du compte affiche le nom, pas le numéro', async ({ page }) => {
  test.skip(
    !email || !password,
    'Set LIGUITA_E2E_EMAIL and LIGUITA_E2E_PASSWORD to run this test.',
  );

  await page.goto('/connexion');
  await page.getByLabel('Adresse email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await page.goto('/app');
  const menu = page.getByRole('button', { name: 'Ouvrir le menu du compte' });
  await expect(menu).toBeVisible();

  const displayName = process.env.LIGUITA_E2E_DISPLAY_NAME;
  if (displayName) {
    await expect(menu).toContainText(displayName);
  }

  await menu.click();

  // Les trois entrées attendues, dans l'ordre.
  await expect(page.getByRole('menuitem', { name: 'Mon profil' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Paramètres' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Se déconnecter' })).toBeVisible();
});

test('le profil affiche l’identité et la méthode de connexion', async ({ page }) => {
  test.skip(
    !email || !password,
    'Set LIGUITA_E2E_EMAIL and LIGUITA_E2E_PASSWORD to run this test.',
  );

  await page.goto('/connexion');
  await page.getByLabel('Adresse email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await page.goto('/app/profil');

  await expect(page.getByRole('heading', { name: 'Mon profil' })).toBeVisible();
  await expect(page.getByText('Méthode de connexion')).toBeVisible();
  await expect(page.getByLabel('Prénom')).toBeVisible();
  await expect(page.getByLabel('Nom')).toBeVisible();
  await expect(page.getByLabel('Téléphone')).toBeVisible();

  /* Aucune information technique d'authentification ne doit apparaître dans la page :
     ni identifiant interne, ni nom de fournisseur brut, ni jeton. */
  const body = (await page.locator('main').innerText()).toLowerCase();
  for (const forbidden of ['user_id', 'provider_id', 'sub:', 'eyj', 'access_token']) {
    expect(body).not.toContain(forbidden);
  }
});
