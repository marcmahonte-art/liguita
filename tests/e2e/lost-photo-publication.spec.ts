import { expect, test } from '@playwright/test';

const email = process.env.LIGUITA_E2E_EMAIL;
const password = process.env.LIGUITA_E2E_PASSWORD;
const photo = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('publishes a lost item with a photo and finds it publicly', async ({ page }) => {
  test.skip(
    !email || !password,
    'Set LIGUITA_E2E_EMAIL and LIGUITA_E2E_PASSWORD to run this test.',
  );

  const title = `E2E objet photo ${Date.now()}`;
  await page.goto('/connexion?redirect=/declarer/perdu');
  await page.getByLabel('Adresse email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/declarer\/perdu/);

  await page.getByLabel("Catégorie d'objet").selectOption({ index: 1 });
  await page.getByLabel("Type d'objet").click();
  await page.getByRole('listbox').getByRole('option').first().click();
  await page.getByPlaceholder(/Carte nationale d'identité/).fill(title);
  await page.locator('#lost-photos').setInputFiles({
    name: 'e2e-object.png',
    mimeType: 'image/png',
    buffer: photo,
  });
  await page.getByRole('button', { name: /Continuer : Lieu et date/ }).click();
  await page.getByPlaceholder(/Près du grand marché/).fill('Lieu de test E2E');
  await page.getByRole('button', { name: 'Publier ma déclaration' }).click();

  await expect(
    page.getByRole('heading', { name: 'Déclaration de perte enregistrée !' }),
  ).toBeVisible();
  await page.goto(`/rechercher?kind=lost&q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByAltText(`Photo de l’objet perdu : ${title}`)).toBeVisible();
});
