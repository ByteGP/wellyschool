import { expect, test } from '@playwright/test';

test.describe('lesson browser', () => {
  test('lists every public lesson for the segment with search hidden until JS loads', async ({
    page,
  }) => {
    await page.goto('/teacher/kids/');
    const list = page.locator('[data-lesson-list] > li');
    await expect(list).toHaveCount(150);
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

    // Passage reference search narrows the list and finds the matching lesson
    // (robust to cross-references growing as more lessons cite a passage).
    await search.fill('mark 4');
    const passageMatches = await visibleRows.count();
    expect(passageMatches).toBeGreaterThan(0);
    expect(passageMatches).toBeLessThan(150);
    await expect(visibleRows.filter({ hasText: 'Jesus Calms the Storm' })).toHaveCount(1);

    // No match shows the empty state, clearing restores everything.
    await search.fill('zebra');
    await expect(visibleRows).toHaveCount(0);
    await expect(page.getByText('No lessons match')).toBeVisible();
    await search.fill('');
    await expect(visibleRows).toHaveCount(150);
  });

  test('series filter narrows by cycle', async ({ page }) => {
    await page.goto('/teacher/kids/');
    const visibleRows = page.locator('[data-lesson-list] > li:not([hidden])');
    await page.getByLabel('Filter by series').selectOption({ label: 'God Made and Cares' });
    await expect(visibleRows).toHaveCount(30);
    await expect(visibleRows.first()).toContainText('God Made a Good World');
  });

  test('parents get the same browser linking to devotional routes', async ({ page }) => {
    await page.goto('/family/youths/');
    await expect(page.getByRole('heading', { name: 'All Youths lessons' })).toBeVisible();
    await page.getByPlaceholder('Search by title, passage, or topic').fill('ecclesiastes');
    const visibleRows = page.locator('[data-lesson-list] > li:not([hidden])');
    await expect(visibleRows).toHaveCount(1);
    await visibleRows.first().getByRole('link').click();
    await expect(page).toHaveURL(/\/family\/youths\/y2-l13\/$/);
  });

  test('all lessons remain visible and reachable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/teacher/teens/');
    await expect(page.locator('[data-lesson-list] > li')).toHaveCount(150);
    // Search controls stay hidden without JS instead of rendering dead inputs.
    await expect(page.getByPlaceholder('Search by title, passage, or topic')).toBeHidden();
    await context.close();
  });
});
