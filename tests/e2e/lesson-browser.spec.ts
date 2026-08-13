import { expect, test } from '@playwright/test';

test.describe('lesson browser', () => {
  test('lists every public lesson for the segment with search hidden until JS loads', async ({
    page,
  }) => {
    await page.goto('/teacher/kids/');
    const list = page.locator('[data-lesson-list] > li');
    await expect(list).toHaveCount(23);
    await expect(page.getByRole('heading', { name: 'All Kids lessons' })).toBeVisible();
    await expect(page.getByPlaceholder('Search by title, passage, or topic')).toBeVisible();
  });

  test('search narrows by title, passage, and topic words', async ({ page }) => {
    await page.goto('/teacher/kids/');
    const search = page.getByPlaceholder('Search by title, passage, or topic');
    const visibleRows = page.locator('[data-lesson-list] > li:not([hidden])');

    await search.fill('storm');
    await expect(visibleRows).toHaveCount(1);
    await expect(visibleRows.first()).toContainText('Jesus Calms the Storm');

    // Passage reference search.
    await search.fill('mark 4');
    await expect(visibleRows).toHaveCount(1);

    // No match shows the empty state, clearing restores everything.
    await search.fill('zebra');
    await expect(visibleRows).toHaveCount(0);
    await expect(page.getByText('No lessons match')).toBeVisible();
    await search.fill('');
    await expect(visibleRows).toHaveCount(23);
  });

  test('series filter narrows by cycle', async ({ page }) => {
    await page.goto('/teacher/kids/');
    const visibleRows = page.locator('[data-lesson-list] > li:not([hidden])');
    await page.getByLabel('Filter by series').selectOption({ label: 'God Made and Cares' });
    await expect(visibleRows).toHaveCount(22);
    await expect(visibleRows.first()).toContainText('God Made a Good World');
  });

  test('parents get the same browser linking to devotional routes', async ({ page }) => {
    await page.goto('/family/youths/');
    await expect(page.getByRole('heading', { name: 'All Youths lessons' })).toBeVisible();
    await page.getByPlaceholder('Search by title, passage, or topic').fill('job');
    const visibleRows = page.locator('[data-lesson-list] > li:not([hidden])');
    await expect(visibleRows).toHaveCount(1);
    await visibleRows.first().getByRole('link').click();
    await expect(page).toHaveURL(/\/family\/youths\/y2-l12\/$/);
  });

  test('all lessons remain visible and reachable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/teacher/teens/');
    await expect(page.locator('[data-lesson-list] > li')).toHaveCount(24);
    // Search controls stay hidden without JS instead of rendering dead inputs.
    await expect(page.getByPlaceholder('Search by title, passage, or topic')).toBeHidden();
    await context.close();
  });
});
