import { expect, test } from '@playwright/test';

// The calendar reminder links to a lesson's "Prepare before class" section via
// the #prepare deep link. The section is a collapsed <details> by default; the
// deep link must open it.
test.describe('prepare deep link', () => {
  test('Prepare section is collapsed by default', async ({ page }) => {
    await page.goto('/teacher/kids/k1-l01/');
    const prepare = page.locator('#prepare');
    await expect(prepare).toBeVisible();
    expect(await prepare.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
  });

  test('#prepare opens and reveals the Prepare section', async ({ page }) => {
    await page.goto('/teacher/kids/k1-l01/#prepare');
    const prepare = page.locator('#prepare');
    await expect(prepare).toHaveJSProperty('open', true);
    await expect(prepare.getByRole('heading', { name: 'Passage context' })).toBeVisible();
  });
});
