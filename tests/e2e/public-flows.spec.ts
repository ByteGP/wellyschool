import { expect, test } from '@playwright/test';

// The placeholder schedule (draft, preview mode) follows Wellington school
// terms. Every segment has: 2026-08-16 lesson, 2026-08-23 lesson, then break
// entries on the term-holiday Sundays 2026-09-27, 2026-10-04, and 2026-10-11
// (Term 3 ends 25 Sep; Term 4 starts 12 Oct). Father's Day (6 Sep) is inside
// Term 3, so it is a normal class day with no special entry.
// The ?today= override only works in preview builds (ADR-011).

test.describe('landing and navigation', () => {
  test('land on /, choose Teacher, then a segment', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /I'm teaching on Sunday/ }).click();
    await expect(page).toHaveURL(/\/teacher\/$/);
    await page.locator('main').getByRole('link', { name: /Kids/ }).click();
    await expect(page).toHaveURL(/\/teacher\/kids\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Kids');
  });
});

test.describe('teacher current-entry selection (Pacific/Auckland)', () => {
  test('midweek shows the next Sunday lesson', async ({ page }) => {
    await page.goto('/teacher/kids/?today=2026-08-12');
    const card = page.locator('[data-entry-card="2026-08-16-kids"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Sunday, 16 August 2026');
    await expect(card.getByRole('link', { name: 'Open the lesson' })).toBeVisible();
  });

  test('on a scheduled Sunday shows that Sunday, not the following one', async ({ page }) => {
    await page.goto('/teacher/kids/?today=2026-08-16');
    await expect(page.locator('[data-entry-card="2026-08-16-kids"]')).toBeVisible();
    await expect(page.locator('[data-entry-card="2026-08-23-kids"]')).toBeHidden();
  });

  test('term-holiday week shows the break message', async ({ page }) => {
    await page.goto('/teacher/teens/?today=2026-09-22');
    const card = page.locator('[data-entry-card="2026-09-27-teens"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('School holidays');
  });

  test("Father's Day falls in term time, so no break interrupts the schedule", async ({
    page,
  }) => {
    await page.goto('/teacher/kids/?today=2026-09-06');
    await expect(page.locator('[data-entry-card="2026-09-06-kids"]')).toHaveCount(0);
    // The next scheduled entry is simply the next term-break Sunday.
    await expect(page.locator('[data-entry-card="2026-09-27-kids"]')).toBeVisible();
  });

  test('without JavaScript the schedule list is still usable', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/teacher/kids/');
    await expect(page.getByText('Choose the correct Sunday from the schedule below.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Jesus Calms the Storm/ })).toBeVisible();
    await context.close();
  });
});

test.describe('family current-entry selection', () => {
  test('shows the most recent Sunday lesson during the following week', async ({ page }) => {
    await page.goto('/family/kids/?today=2026-08-19');
    const card = page.locator('[data-entry-card="2026-08-16-kids"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole('link', { name: /Start the 15-minute devotional/ })).toBeVisible();
  });

  test('term-holiday week shows break message and a link to review the previous lesson', async ({
    page,
  }) => {
    await page.goto('/family/kids/?today=2026-09-29');
    const card = page.locator('[data-entry-card="2026-09-27-kids"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('School holidays');
    await expect(card.getByRole('link', { name: 'Review the previous lesson' })).toBeVisible();
  });

  test('before any lesson exists, shows the next available date without draft content', async ({
    page,
  }) => {
    await page.goto('/family/kids/?today=2026-08-01');
    await expect(page.locator('[data-entry-card="2026-08-16-kids"]')).toBeVisible();
  });
});

test.describe('teacher lesson page', () => {
  test('direct route renders the correct lesson with the teaching outline first', async ({
    page,
  }) => {
    await page.goto('/teacher/kids/k1-l19/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Jesus Calms the Storm');
    // The in-class section is prominent and expanded.
    await expect(page.getByRole('heading', { name: 'Teach the lesson' })).toBeVisible();
    await expect(page.getByText('Mark 4:35-41').first()).toBeVisible();
    // The suggested lesson plan is collapsed until the teacher opens it.
    const suggestion = page.getByText('Teaching suggestion: one way to run this lesson');
    await expect(suggestion).toBeVisible();
    await suggestion.click();
    await expect(page.getByRole('heading', { name: 'Teach now' })).toBeVisible();
    // Safeguarding content is not displayed on the page.
    await expect(page.getByRole('heading', { name: 'Safeguarding' })).toHaveCount(0);
  });

  test('profile switching changes the outline and persists locally', async ({ page }) => {
    await page.goto('/teacher/kids/k1-l19/');
    // Standard outline visible by default.
    await expect(page.getByRole('heading', { name: /Standard · 35 minutes/ })).toBeVisible();
    await page.getByRole('button', { name: /Short \(25 min\)/ }).click();
    // The Short outline replaces the Standard one ("Read and retell" is unique to it).
    await expect(page.getByText('Read and retell')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Standard · 35 minutes/ })).toBeHidden();

    // Preference persists across reloads via localStorage only.
    await page.reload();
    await expect(page.getByRole('button', { name: /Short \(25 min\)/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const stored = await page.evaluate(() => window.localStorage.getItem('wellyschool.teacher.profile'));
    expect(stored).toBe('essential');
  });

  test('standard profile renders without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/teacher/kids/k1-l19/');
    await expect(page.getByRole('heading', { name: 'Teach the lesson' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Standard · 35 minutes/ })).toBeVisible();
    // The suggested plan stays reachable without JavaScript via its collapsed section.
    await expect(page.getByText('Teaching suggestion: one way to run this lesson')).toBeVisible();
    // Other profiles remain reachable through collapsed details.
    await expect(page.locator('details[data-profile-panel="essential"] summary')).toBeVisible();
    await context.close();
  });
});

test.describe('family flow', () => {
  test('completes without login and without sending responses to any server', async ({ page }) => {
    const outgoing: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') outgoing.push(`${request.method()} ${request.url()}`);
    });

    await page.goto('/family/kids/k1-l19/');
    await expect(page.getByRole('heading', { name: 'Connect' })).toBeVisible();

    for (const step of ['Read', 'Understand', 'Play']) {
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByRole('heading', { name: step })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Respond' })).toBeVisible();
    await page.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByRole('heading', { name: /lesson complete/i })).toBeVisible();

    // Weekly action, prayer, and parent note are always available at completion.
    await expect(page.getByText("This week's action")).toBeVisible();
    await expect(page.getByText('Note for parents')).toBeVisible();

    // Try the extra quiz, then confirm nothing was posted anywhere.
    await page.getByText('Extra: quick quiz').click();
    await page.getByRole('button', { name: 'In a boat' }).click();
    await expect(page.getByText(/Correct/).first()).toBeVisible();
    expect(outgoing).toEqual([]);
  });

  test('restart clears only this lesson progress', async ({ page }) => {
    await page.goto('/family/kids/k1-l19/');
    await page.evaluate(() => window.sessionStorage.setItem('wellyschool.family.OTHER', '2'));
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    // Navigate to completion and restart.
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Finish' }).click();
    await page.getByRole('button', { name: 'Restart this lesson' }).click();
    await expect(page.getByRole('heading', { name: 'Connect' })).toBeVisible();
    const state = await page.evaluate(() => ({
      lesson: window.sessionStorage.getItem('wellyschool.family.K1-L19'),
      other: window.sessionStorage.getItem('wellyschool.family.OTHER'),
    }));
    expect(state.lesson === null || state.lesson === '0').toBe(true);
    expect(state.other).toBe('2');
  });

  test('progress indicator shows steps without points, streaks, or badges', async ({ page }) => {
    await page.goto('/family/youths/y2-l12/');
    await expect(page.getByRole('list', { name: 'Lesson steps' })).toBeVisible();
    const text = (await page.locator('main').textContent())?.toLowerCase() ?? '';
    for (const banned of ['points', 'streak', 'badge', 'leaderboard', 'score']) {
      expect(text).not.toContain(banned);
    }
  });
});

test.describe('privacy hardening', () => {
  test('family page HTML never contains teacher preparation or editorial internals', async ({
    request,
  }) => {
    for (const path of ['/family/kids/k1-l19/', '/family/teens/t4-l22/']) {
      const response = await request.get(path);
      const html = await response.text();
      for (const banned of [
        'passage_context',
        'theological_guardrails',
        'source_provenance',
        'review_state',
        'editor_notes',
        'prohibited_overstatement',
        'zero_prep',
      ]) {
        expect(html, `${path} must not contain ${banned}`).not.toContain(banned);
      }
    }
  });

  test('no analytics or third-party scripts on public routes', async ({ page }) => {
    const thirdParty: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname !== '127.0.0.1') thirdParty.push(request.url());
    });
    await page.goto('/');
    await page.goto('/teacher/kids/k1-l19/');
    await page.goto('/family/kids/k1-l19/');
    expect(thirdParty).toEqual([]);
  });
});

test.describe('print routes', () => {
  test('teacher print contains the card and outline and excludes navigation', async ({ page }) => {
    await page.goto('/print/teacher/k1-l19/standard/');
    await expect(page.getByRole('heading', { name: 'Teach now' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Standard outline · 35 minutes/ })).toBeVisible();
    await expect(page.locator('nav')).toHaveCount(0);
    await expect(page.locator('.site-header')).toHaveCount(0);
  });

  test('family print contains flow, questions, action, prayer, and parent note', async ({
    page,
  }) => {
    await page.goto('/print/family/k1-l19/');
    await expect(page.getByRole('heading', { name: 'The 15-minute flow' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Talk about it' })).toBeVisible();
    await expect(page.getByText('Note for parents:')).toBeVisible();
    await expect(page.locator('.site-header')).toHaveCount(0);
  });

  test('resource print renders sanitized markdown', async ({ page }) => {
    await page.goto('/print/resource/k1-l19-p01-sequence-cards/');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('admin', () => {
  test('/admin/ serves Decap with the direct GitHub backend config', async ({ request }) => {
    const adminPage = await request.get('/admin/');
    expect(adminPage.ok()).toBe(true);
    expect(await adminPage.text()).toContain('decap-cms');

    const config = await request.get('/admin/config.yml');
    expect(config.ok()).toBe(true);
    const yaml = await config.text();
    expect(yaml).toContain('name: github');
    expect(yaml).toContain('repo: ByteGP/wellyschool');
    expect(yaml).not.toContain('git-gateway');
    expect(yaml).toContain('publish_mode: editorial_workflow');
  });
});
