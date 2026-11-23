import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';

// Tablet tier: from 960px wide the class page, lesson page and planner use two
// columns. Below that (portrait tablets, phones) they keep the single column.
const CLASS_PAGE = '/teacher/kids/?today=2026-10-18';
const LESSON = '/teacher/kids/k1-l19/';
const PLANNER = '/teacher/kids/planner/2026-T4/';

const LANDSCAPE = { width: 1180, height: 820 };
const PORTRAIT = { width: 820, height: 1180 };

const open = async (browser: Browser, viewport: { width: number; height: number }) => {
  const context = await browser.newContext({ viewport });
  return { context, page: await context.newPage() };
};

const box = async (locator: Locator) => {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('element is not on the page');
  return bounds;
};

const sidewaysOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const seriousViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
    .map((violation) => `${violation.id}: ${violation.nodes.length} nodes`);
};

test.describe('tablet in landscape', () => {
  test("the class page puts this Sunday's lesson beside the Sundays coming up", async ({
    browser,
  }) => {
    const { context, page } = await open(browser, LANDSCAPE);
    await page.goto(CLASS_PAGE);
    const card = await box(page.locator('[data-entry-card]:not([hidden])'));
    const upcoming = await box(page.getByRole('heading', { name: 'Upcoming Sundays' }));
    expect(upcoming.x).toBeGreaterThanOrEqual(card.x + card.width);
    expect(Math.abs(upcoming.y - card.y)).toBeLessThan(60);

    // All lessons run in two columns: the first two share a row.
    const rows = page.locator('[data-lesson-list] > li');
    const first = await box(rows.nth(0));
    const second = await box(rows.nth(1));
    expect(second.y).toBe(first.y);
    expect(second.x).toBeGreaterThan(first.x + first.width - 1);

    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    expect(await seriousViolations(page)).toEqual([]);
    await context.close();
  });

  test('searching still filters the two-column lesson list', async ({ browser }) => {
    const { context, page } = await open(browser, LANDSCAPE);
    await page.goto(CLASS_PAGE);
    await page.getByLabel('Search lessons').fill('zzzz-no-such-lesson');
    await expect(page.locator('[data-lesson-list] > li:not([hidden])')).toHaveCount(0);
    await expect(page.getByText('No lessons match.')).toBeVisible();
    await context.close();
  });

  test('the lesson page keeps the outline in view beside help and preparation', async ({
    browser,
  }) => {
    const { context, page } = await open(browser, LANDSCAPE);
    await page.goto(LESSON);
    const card = await box(page.locator('[data-profile-switcher]'));
    const prepare = await box(page.locator('#prepare'));
    const print = await box(page.getByRole('link', { name: 'Print this lesson' }));
    expect(prepare.x).toBeGreaterThanOrEqual(card.x + card.width);
    expect(print.x).toBeGreaterThanOrEqual(card.x + card.width);

    // Opening preparation does not push the lesson card down or sideways.
    await page.locator('#prepare > summary').click();
    const after = await box(page.locator('[data-profile-switcher]'));
    expect(after.x).toBe(card.x);
    expect(after.y).toBe(card.y);
    expect(after.width).toBe(card.width);

    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    expect(await seriousViolations(page)).toEqual([]);
    await context.close();
  });

  test("the planner shows the term's Sundays two to a row", async ({ browser }) => {
    const { context, page } = await open(browser, LANDSCAPE);
    await page.goto(PLANNER);
    const sundays = page.locator('.log-list > li');
    await expect(sundays.first()).toBeVisible();
    const first = await box(sundays.nth(0));
    const second = await box(sundays.nth(1));
    expect(second.y).toBe(first.y);
    expect(second.x).toBeGreaterThan(first.x + first.width - 1);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    await context.close();
  });
});

test.describe('tablet in portrait', () => {
  test('the class page, lesson page and planner keep one column', async ({ browser }) => {
    const { context, page } = await open(browser, PORTRAIT);

    await page.goto(CLASS_PAGE);
    const card = await box(page.locator('[data-entry-card]:not([hidden])'));
    const upcoming = await box(page.getByRole('heading', { name: 'Upcoming Sundays' }));
    expect(upcoming.y).toBeGreaterThanOrEqual(card.y + card.height);
    const rows = page.locator('[data-lesson-list] > li');
    expect((await box(rows.nth(1))).y).toBeGreaterThan((await box(rows.nth(0))).y);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);

    await page.goto(LESSON);
    const lessonCard = await box(page.locator('[data-profile-switcher]'));
    const prepare = await box(page.locator('#prepare'));
    expect(prepare.y).toBeGreaterThanOrEqual(lessonCard.y + lessonCard.height);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);

    await page.goto(PLANNER);
    const sundays = page.locator('.log-list > li');
    await expect(sundays.first()).toBeVisible();
    expect((await box(sundays.nth(1))).y).toBeGreaterThan((await box(sundays.nth(0))).y);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);

    await context.close();
  });
});
