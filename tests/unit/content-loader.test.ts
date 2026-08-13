import { describe, expect, it } from 'vitest';
import {
  getAllLessons,
  getAllResources,
  getLessonById,
  getPublicLessons,
  getPublicLessonsBySegment,
  getResourceById,
  getScheduleEntries,
  getSiteSettings,
} from '../../src/lib/content/loader';

describe('content loader (real repository content)', () => {
  it('loads the one hundred and thirteen lessons with unique ids', () => {
    const lessons = getAllLessons();
    expect(lessons).toHaveLength(113);
    expect(new Set(lessons.map((lesson) => lesson.lesson_id)).size).toBe(113);
  });

  it('loads the one hundred and nineteen printable resources and resolves every printable reference', () => {
    expect(getAllResources()).toHaveLength(119);
    for (const lesson of getAllLessons()) {
      for (const printable of lesson.engagement.printables) {
        expect(getResourceById(printable.resource_id), printable.resource_id).toBeDefined();
      }
    }
  });

  it('hides draft seed lessons from production mode (governance boundary)', () => {
    // Seeds are vertical_slice_draft and batch 01 is in_review; production renders none.
    expect(getPublicLessons('production')).toHaveLength(0);
    expect(getPublicLessons('preview')).toHaveLength(113);
  });

  it('groups lessons by segment in non-decreasing sequence order for preview builds', () => {
    const kids = getPublicLessonsBySegment('Kids', 'preview');
    // Every returned lesson is a Kids lesson, and the list is sorted by
    // curriculum sequence (robust across multiple cycles: K1, K2, K5).
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.every((lesson) => lesson.curriculum.segment === 'Kids')).toBe(true);
    for (let i = 1; i < kids.length; i += 1) {
      expect(kids[i].curriculum.sequence).toBeGreaterThanOrEqual(kids[i - 1].curriculum.sequence);
    }
    const ids = new Set(kids.map((lesson) => lesson.lesson_id));
    expect(ids.has('K1-L01')).toBe(true);
    expect(ids.has('K2-L01')).toBe(true);
  });

  it('returns lessons by id regardless of mode for internal use', () => {
    expect(getLessonById('Y2-L12')?.curriculum.segment).toBe('Youths');
  });

  it('loads placeholder schedule entries as drafts only', () => {
    const entries = getScheduleEntries();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.status === 'draft')).toBe(true);
  });

  it('loads site settings with the locked timezone', () => {
    expect(getSiteSettings().timezone).toBe('Pacific/Auckland');
  });
});
