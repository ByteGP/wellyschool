import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const LESSON = '/teacher/kids/k1-l19/';
const TEACH = '/teach/kids/k1-l19/';

const seriousViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
    .map((violation) => `${violation.id}: ${violation.nodes.length} nodes`);
};

test.describe('teach view', () => {
  test('a teacher goes from the lesson page into the teach view and through the steps', async ({
    page,
  }) => {
    await page.goto(LESSON);
    await page.getByRole('link', { name: 'Teach this lesson' }).click();
    await expect(page).toHaveURL(new RegExp(`${TEACH}$`));

    // Focused shell: one way out, no site nav or footer.
    await expect(page.getByRole('link', { name: 'Exit teaching' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Parents' })).toHaveCount(0);
    await expect(page.locator('footer')).toHaveCount(0);

    await page.getByRole('button', { name: 'Start the lesson' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Connect' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Connect' })).toBeFocused();
    await expect(page.getByRole('timer')).toHaveCount(2);
    // The step strip scrolls inside itself; the page never scrolls sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByRole('button', { name: /^Next: / }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Context' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Context' })).toBeFocused();

    // A reload mid-class keeps the place.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Context' })).toBeVisible();
  });

  test("the class page offers this Sunday's lesson to teach straight away", async ({ page }) => {
    // Preview builds honour ?today=, so the card for a known teaching Sunday shows.
    await page.goto('/teacher/kids/?today=2026-10-18');
    const teachNow = page.locator('[data-entry-card]:not([hidden]) [data-teach-now]');
    await expect(teachNow).toBeVisible();
    await teachNow.click();
    await expect(page).toHaveURL(/\/teach\/kids\/k\d-l\d{2}\/$/);
    await expect(page.getByRole('button', { name: 'Start the lesson' })).toBeVisible();
  });

  test('uses the lesson length chosen on the lesson page', async ({ page }) => {
    await page.goto(LESSON);
    await page.getByRole('button', { name: /Short \(25 min\)/ }).click();
    await page.getByRole('link', { name: 'Teach this lesson' }).click();
    await expect(page.getByRole('button', { name: /Short \(25 min\)/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Start the lesson' }).click();
    await expect(page.getByRole('navigation', { name: 'Lesson steps' }).getByRole('button')).toHaveCount(5);
  });

  test('finishing shows the take-home line and leads back to the class page', async ({ page }) => {
    await page.goto(TEACH);
    await page.getByRole('button', { name: 'Start the lesson' }).click();
    const next = page.getByRole('button', { name: /^Next: / });
    while (await next.count()) await next.click();
    await expect(page.getByRole('heading', { name: 'Close the class' })).toBeVisible();
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Lesson finished' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to the Kids class page' })).toHaveAttribute(
      'href',
      '/teacher/kids/',
    );
  });

  test('no serious or critical axe violations before, during and after teaching', async ({
    page,
  }) => {
    await page.goto(TEACH);
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start the lesson' }).click();
    await expect(page.getByRole('timer')).toHaveCount(2);
    expect(await seriousViolations(page)).toEqual([]);
    // The activity step carries the most content: questions aside, materials, a printable.
    await page.getByRole('navigation', { name: 'Lesson steps' }).getByRole('button').nth(4).click();
    expect(await seriousViolations(page)).toEqual([]);
    const next = page.getByRole('button', { name: /^Next: / });
    while (await next.count()) await next.click();
    await page.getByRole('button', { name: 'Finish' }).click();
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test.describe('teach view on a tablet', () => {
  test('landscape puts the steps in a rail beside the current step', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1180, height: 820 } });
    const page = await context.newPage();
    await page.goto(TEACH);
    await page.getByRole('button', { name: 'Start the lesson' }).click();
    const rail = await page.getByRole('navigation', { name: 'Lesson steps' }).boundingBox();
    const stage = await page.getByRole('heading', { level: 1, name: 'Connect' }).boundingBox();
    expect(rail && stage && rail.x + rail.width <= stage.x).toBe(true);
    // Back and Next stay on screen without scrolling.
    await expect(page.getByRole('button', { name: /^Next: / })).toBeInViewport();
    expect(await seriousViolations(page)).toEqual([]);
    await context.close();
  });

  test('portrait stacks the steps above the current step with no sideways scroll', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 820, height: 1180 } });
    const page = await context.newPage();
    await page.goto(TEACH);
    await page.getByRole('button', { name: 'Start the lesson' }).click();
    const rail = await page.getByRole('navigation', { name: 'Lesson steps' }).boundingBox();
    const stage = await page.getByRole('heading', { level: 1, name: 'Connect' }).boundingBox();
    expect(rail && stage && rail.y + rail.height <= stage.y).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole('button', { name: /^Next: / })).toBeInViewport();
    await context.close();
  });

  test('every step button and control is at least 44px tall', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 820, height: 1180 } });
    const page = await context.newPage();
    await page.goto(TEACH);
    await page.getByRole('button', { name: 'Start the lesson' }).click();
    const heights = await page
      .locator('.teach button')
      .evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().height)));
    expect(heights.length).toBeGreaterThan(5);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
    await context.close();
  });
});
