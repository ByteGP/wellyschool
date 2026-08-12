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
  it('loads the twenty-four lessons with unique ids', () => {
    const lessons = getAllLessons();
    expect(lessons).toHaveLength(24);
    expect(new Set(lessons.map((lesson) => lesson.lesson_id)).size).toBe(24);
  });

  it('loads the twenty-nine printable resources and resolves every printable reference', () => {
    expect(getAllResources()).toHaveLength(29);
    for (const lesson of getAllLessons()) {
      for (const printable of lesson.engagement.printables) {
        expect(getResourceById(printable.resource_id), printable.resource_id).toBeDefined();
      }
    }
  });

  it('hides draft seed lessons from production mode (governance boundary)', () => {
    // Seeds are vertical_slice_draft and batch 01 is in_review; production renders none.
    expect(getPublicLessons('production')).toHaveLength(0);
    expect(getPublicLessons('preview')).toHaveLength(24);
  });

  it('groups lessons by segment in sequence order for preview builds', () => {
    const kids = getPublicLessonsBySegment('Kids', 'preview');
    expect(kids.map((lesson) => lesson.lesson_id)).toEqual(['K1-L01', 'K1-L02', 'K1-L03', 'K1-L04', 'K1-L05', 'K1-L06', 'K5-L13', 'K1-L19']);
    expect(kids[0].curriculum.sequence).toBeLessThan(kids[1].curriculum.sequence);
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
