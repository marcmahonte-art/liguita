import { expect, test } from '@playwright/test';

test.describe('public item surfaces', () => {
  test('lost items page is available', async ({ page }) => {
    const response = await page.goto('/objets-perdus');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Objets perdus au Tchad' })).toBeVisible();
  });

  test('found items page is available', async ({ page }) => {
    const response = await page.goto('/objets-trouves');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Objets trouvés au Tchad' })).toBeVisible();
  });

  test('lost filter is available in search', async ({ page }) => {
    const response = await page.goto('/rechercher?kind=lost');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Objets perdus' })).toBeVisible();
  });
});
