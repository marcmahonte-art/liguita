import { expect, test } from '@playwright/test';

const email = process.env.LIGUITA_E2E_EMAIL;
const password = process.env.LIGUITA_E2E_PASSWORD;

test('authenticated user reaches the lost-item declaration form', async ({ page }) => {
  test.skip(
    !email || !password,
    'Set LIGUITA_E2E_EMAIL and LIGUITA_E2E_PASSWORD to run this test.',
  );

  await page.goto('/connexion?redirect=/declarer/perdu');
  await page.getByLabel('Adresse email').fill(email!);
  await page.getByLabel('Mot de passe').fill(password!);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/declarer\/perdu/);
  await expect(page.getByRole('heading', { name: "J'ai perdu un objet" })).toBeVisible();
});
