import { describe, expect, it } from 'vitest';
import { getLessonLinks } from '../../src/lib/integration/lesson-links';
import { buildRedirects, FALLBACK_SLUGS } from '../../src/lib/integration/redirects.mjs';

describe('getLessonLinks (calendar integration surface)', () => {
  it('resolves scheduled lessons to date + class + paths in preview mode', () => {
    const links = getLessonLinks('preview');
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      expect(link.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['kids', 'youths', 'teens']).toContain(link.class);
      expect(link.lessonPath).toBe(`/teacher/${link.class}/${link.lessonId.toLowerCase()}/`);
      expect(link.preparePath).toBe(`${link.lessonPath}#prepare`);
      expect(link.title.length).toBeGreaterThan(0);
      expect(link.passages.length).toBeGreaterThan(0);
    }
  });

  it('maps the first Kids Sunday to K1-L01 with its header fields', () => {
    const firstKids = getLessonLinks('preview')
      .filter((link) => link.class === 'kids')
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    expect(firstKids.lessonId).toBe('K1-L01');
    expect(firstKids.title).toBe('God Made a Good World');
    expect(firstKids.passages).toBe('Genesis 1:1-25; Genesis 1:31');
    expect(firstKids.preparePath).toBe('/teacher/kids/k1-l01/#prepare');
  });

  it('follows the content-mode gate (production and preview agree post go-live)', () => {
    // The feed follows CONTENT_MODE like the pages do. Post go-live (ADR-015)
    // every lesson is approved, so production resolves the same scheduled links
    // as preview rather than the empty set it produced during the pilot.
    const production = getLessonLinks('production');
    const preview = getLessonLinks('preview');
    expect(production.length).toBeGreaterThan(0);
    expect(production.length).toBe(preview.length);
  });
});

describe('buildRedirects', () => {
  const entries = [
    {
      date: '2026-08-30',
      class: 'kids',
      lessonPath: '/teacher/kids/k1-l01/',
      preparePath: '/teacher/kids/k1-l01/#prepare',
    },
  ];

  it('emits exact 301 rules for the lesson and its prepare deep link', () => {
    const body = buildRedirects(entries);
    expect(body).toContain('/l/2026-08-30/kids\t/teacher/kids/k1-l01/\t301');
    expect(body).toContain('/l/2026-08-30/kids/prepare\t/teacher/kids/k1-l01/#prepare\t301');
  });

  it('emits a safe 302 fallback for every class after the exact rules', () => {
    const body = buildRedirects(entries);
    const exactIndex = body.indexOf('/l/2026-08-30/kids\t');
    for (const slug of FALLBACK_SLUGS) {
      const fallback = `/l/:date/${slug}\t/teacher/${slug}/\t302`;
      expect(body).toContain(fallback);
      expect(body.indexOf(fallback)).toBeGreaterThan(exactIndex);
    }
  });
});
