import { expect, test } from '@playwright/test';

// The Netlify Function is not available under the static test server, so these
// tests mock /api/teaching-log to exercise the planner page + log island.

test.describe('term planner + teaching log', () => {
  test('renders the term, planned lessons, passcode field, and term switcher', async ({ page }) => {
    await page.route('**/api/teaching-log', (route) =>
      route.fulfill({ status: 200, json: { entries: [] } }),
    );
    await page.goto('/teacher/kids/planner/2026-T3/');
    await expect(page.getByRole('heading', { name: /2026-T3 teaching log/ })).toBeVisible();
    // Term switcher links to other terms.
    await expect(page.getByRole('link', { name: '2026-T4' })).toBeVisible();
    // Passcode field is present.
    await expect(page.getByLabel(/Teacher passcode/)).toBeVisible();
    // At least one planned lesson row with Mark taught controls.
    await expect(page.getByRole('button', { name: 'Mark taught' }).first()).toBeVisible();
  });

  test('shows saved statuses from the shared log', async ({ page }) => {
    await page.route('**/api/teaching-log', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          json: {
            entries: [
              { date: '2026-07-26', segment: 'Kids', status: 'taught', updated_at: 'x' },
              {
                date: '2026-08-02',
                segment: 'Kids',
                status: 'swapped',
                actual_lesson_id: 'K1-L07',
                updated_at: 'x',
              },
            ],
          },
        });
      }
      return route.fulfill({ status: 200, json: { entries: [] } });
    });
    await page.goto('/teacher/kids/planner/2026-T3/');
    await expect(page.getByText('1', { exact: false })).toBeTruthy();
    await expect(page.getByText('Recorded swap: K1-L07')).toBeVisible();
  });

  test('marking taught posts with the passcode and updates optimistically', async ({ page }) => {
    let posted: Record<string, unknown> | null = null;
    await page.route('**/api/teaching-log', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        return route.fulfill({ status: 200, json: { entries: [] } });
      }
      posted = request.postDataJSON();
      return route.fulfill({
        status: 200,
        json: { entry: { ...posted, updated_at: '2026-08-16T00:00:00Z' } },
      });
    });
    await page.goto('/teacher/teens/planner/2026-T3/');
    await page.getByLabel(/Teacher passcode/).fill('secret123');
    await page.getByRole('button', { name: 'Mark taught' }).first().click();
    await expect(page.getByText('Taught').first()).toBeVisible();
    expect(posted).toMatchObject({ segment: 'Teens', status: 'taught' });
    // Passcode is remembered locally after a successful save.
    const stored = await page.evaluate(() =>
      window.localStorage.getItem('wellyschool.teacher.passcode'),
    );
    expect(stored).toBe('secret123');
  });

  test('a wrong passcode surfaces the server error', async ({ page }) => {
    await page.route('**/api/teaching-log', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, json: { entries: [] } });
      }
      return route.fulfill({ status: 401, json: { error: 'Incorrect or missing teacher passcode.' } });
    });
    await page.goto('/teacher/kids/planner/2026-T3/');
    await page.getByLabel(/Teacher passcode/).fill('wrong');
    await page.getByRole('button', { name: 'Mark taught' }).first().click();
    await expect(page.getByRole('alert')).toContainText('Incorrect or missing teacher passcode');
  });
});
