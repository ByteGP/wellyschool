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
  it('loads the one hundred and thirty lessons with unique ids', () => {
    const lessons = getAllLessons();
    expect(lessons).toHaveLength(130);
    expect(new Set(lessons.map((lesson) => lesson.lesson_id)).size).toBe(130);
  });

  it('loads the one hundred and thirty-seven printable resources and resolves every printable reference', () => {
    expect(getAllResources()).toHaveLength(137);
    for (const lesson of getAllLessons()) {
      for (const printable of lesson.engagement.printables) {
        expect(getResourceById(printable.resource_id), printable.resource_id).toBeDefined();
      }
    }
  });

  it('hides draft seed lessons from production mode (governance boundary)', () => {
    // Seeds are vertical_slice_draft and batch 01 is in_review; production renders none.
    expect(getPublicLessons('production')).toHaveLength(0);
    expect(getPublicLessons('preview')).toHaveLength(130);
  });

  it('groups lessons by segment as contiguous cycle blocks, sequenced within each', () => {
    const kids = getPublicLessonsBySegment('Kids', 'preview');
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.every((lesson) => lesson.curriculum.segment === 'Kids')).toBe(true);
    // Cycles form contiguous blocks (each cycle_id appears in one run), and
    // within a block the sequence is non-decreasing.
    const seenCycles = new Set<string>();
    for (let i = 0; i < kids.length; i += 1) {
      const cycle = kids[i].curriculum.cycle_id;
      if (i > 0) {
        const prev = kids[i - 1].curriculum;
        if (prev.cycle_id === cycle) {
          expect(kids[i].curriculum.sequence).toBeGreaterThanOrEqual(prev.sequence);
        } else {
          // New cycle starting: it must not have appeared earlier (contiguous).
          expect(seenCycles.has(cycle)).toBe(false);
        }
      }
      seenCycles.add(cycle);
    }
    // K1 block precedes the K2 block (localeCompare on cycle_id).
    const firstK1 = kids.findIndex((l) => l.curriculum.cycle_id === 'K1');
    const firstK2 = kids.findIndex((l) => l.curriculum.cycle_id === 'K2');
    expect(firstK1).toBeGreaterThanOrEqual(0);
    expect(firstK2).toBeGreaterThan(firstK1);
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
