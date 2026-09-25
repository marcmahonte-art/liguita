import { expect, test } from '@playwright/test';

const email = process.env.LIGUITA_E2E_EMAIL;
const password = process.env.LIGUITA_E2E_PASSWORD;
const photo = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test('publishes a found item with a photo and finds it publicly', async ({ page }) => {
  test.skip(
    !email || !password,
    'Set LIGUITA_E2E_EMAIL and LIGUITA_E2E_PASSWORD to run this test.',
  );

  const title = `E2E objet trouvé ${Date.now()}`;
  await page.goto('/connexion?redirect=/declarer/trouve');
  await page.getByLabel('Adresse email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/declarer\/trouve/);

  await page.getByLabel('Catégorie').selectOption({ index: 1 });
  await page.getByLabel("Type d'objet").click();
  await page.getByRole('listbox').getByRole('option').first().click();
  await page.getByPlaceholder(/Trousseau de 4 clés/).fill(title);
  await page.locator('#found-photos').setInputFiles({
    name: 'e2e-found.png',
    mimeType: 'image/png',
    buffer: photo,
  });
  await page.getByPlaceholder(/Près de la station/).fill('Lieu de test E2E');
  await page.getByRole('button', { name: /Publier l'objet trouvé/ }).click();

  await expect(
    page.getByRole('heading', { name: 'Merci pour votre geste civique !' }),
  ).toBeVisible();
  await page.goto(`/rechercher?kind=found&q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByAltText(`Photo de l’objet trouvé : ${title}`)).toBeVisible();
});
