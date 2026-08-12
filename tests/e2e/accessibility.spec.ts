import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const CORE_ROUTES = [
  '/',
  '/teacher/',
  '/teacher/kids/',
  '/teacher/kids/k1-l19/',
  '/family/',
  '/family/kids/',
  '/family/kids/k1-l19/',
  '/print/teacher/k1-l19/standard/',
  '/print/family/k1-l19/',
];

test.describe('axe checks on core routes', () => {
  for (const route of CORE_ROUTES) {
    test(`no serious or critical violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      );
      expect(
        serious.map((violation) => `${violation.id}: ${violation.nodes.length} nodes`),
      ).toEqual([]);
    });
  }
});

test.describe('keyboard support', () => {
  test('family stepper is fully keyboard operable', async ({ page }) => {
    await page.goto('/family/kids/k1-l19/');
    const next = page.getByRole('button', { name: 'Next' });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Read' })).toBeVisible();
    // Focus moved to the step heading for announcement.
    const focusedText = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(focusedText).toContain('Read');
  });

  test('skip link jumps to main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });

  test('sequence puzzle needs no dragging', async ({ page }) => {
    await page.goto('/family/kids/k5-l13/');
    // K5-L13's family interactive is the matching puzzle; play step renders selects.
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Play' })).toBeVisible();
    const selects = page.locator('select');
    await expect(selects.first()).toBeVisible();
  });
});

test.describe('reduced motion', () => {
  test('pages render correctly with prefers-reduced-motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/family/kids/k1-l19/');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Read' })).toBeVisible();
    await context.close();
  });
});
