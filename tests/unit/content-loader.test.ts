import { describe, expect, it } from 'vitest';
import {
  getAllLessons,
  getAllResources,
  getLessonById,
  getPublicLessons,
  getPublicLessonsBySegment,
  getResourceById,
  getEffectiveSchedule,
  getScheduleEntries,
  getSiteSettings,
} from '../../src/lib/content/loader';

describe('content loader (real repository content)', () => {
  it('loads the three hundred and six lessons with unique ids', () => {
    const lessons = getAllLessons();
    expect(lessons).toHaveLength(306);
    expect(new Set(lessons.map((lesson) => lesson.lesson_id)).size).toBe(306);
  });

  it('loads the three hundred and nine printable resources and resolves every printable reference', () => {
    expect(getAllResources()).toHaveLength(309);
    for (const lesson of getAllLessons()) {
      for (const printable of lesson.engagement.printables) {
        expect(getResourceById(printable.resource_id), printable.resource_id).toBeDefined();
      }
    }
  });

  it('renders the approved curriculum in production mode (ADR-015 go-live)', () => {
    // Post go-live (ADR-015) every lesson is status "approved" and content
    // batches now import approved, so production and preview see the same set.
    expect(getPublicLessons('production')).toHaveLength(306);
    expect(getPublicLessons('preview')).toHaveLength(306);
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

  it('has no explicit schedule override files by default (schedule is generated)', () => {
    // Term dates auto-generate the schedule (ADR-013); explicit entries are only
    // for special Sundays / manual swaps, of which there are none in the repo.
    expect(getScheduleEntries()).toHaveLength(0);
  });

  it('generates a term-driven schedule that assigns lessons and marks breaks', () => {
    const entries = getEffectiveSchedule('preview');
    const kidsLessons = entries.filter((e) => e.segment === 'Kids' && e.entry_type === 'lesson');
    const kidsBreaks = entries.filter((e) => e.segment === 'Kids' && e.entry_type === 'break');
    // Every Kids lesson is placed on a Sunday, and holiday Sundays become breaks.
    expect(kidsLessons.length).toBeGreaterThan(0);
    expect(kidsBreaks.length).toBeGreaterThan(0);
    expect(entries.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date))).toBe(true);
    // Generated entries are approved so they drive selection in both modes.
    expect(entries.every((e) => e.status === 'approved')).toBe(true);
  });

  it('loads site settings with the locked timezone', () => {
    expect(getSiteSettings().timezone).toBe('Pacific/Auckland');
  });
});
