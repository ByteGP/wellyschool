import { describe, expect, it } from 'vitest';
import type { LessonContent } from '../../src/types';
import {
  classSundays,
  nextTermStartAfter,
  sundaysInRange,
  termForDate,
  type TermSettings,
} from '../../src/lib/schedule/terms';
import { generateScheduleForSegment } from '../../src/lib/schedule/generate';

const settings: TermSettings = {
  timezone: 'Pacific/Auckland',
  break_message: 'School holidays.',
  terms: [
    { term_id: '2026-T3', year: 2026, term: 3, start: '2026-07-20', end: '2026-09-25' },
    { term_id: '2026-T4', year: 2026, term: 4, start: '2026-10-12', end: '2026-12-18' },
  ],
};

const lesson = (id: string, cycle: string, seq: number): LessonContent =>
  ({
    lesson_id: id,
    curriculum: { segment: 'Kids', cycle_id: cycle, sequence: seq },
  }) as unknown as LessonContent;

describe('sundaysInRange', () => {
  it('lists Sundays inclusive of the range', () => {
    // 2026-07-20 is a Monday; first Sunday is 2026-07-26.
    expect(sundaysInRange('2026-07-20', '2026-08-10')).toEqual([
      '2026-07-26',
      '2026-08-02',
      '2026-08-09',
    ]);
  });
});

describe('classSundays / termForDate / nextTermStartAfter', () => {
  it('collects term-time Sundays across all terms', () => {
    const sundays = classSundays(settings);
    expect(sundays[0]).toBe('2026-07-26');
    expect(sundays).toContain('2026-09-20');
    // Holiday Sundays are excluded.
    expect(sundays).not.toContain('2026-09-27');
    expect(sundays).not.toContain('2026-10-04');
  });

  it('identifies the term containing a date and the next term start', () => {
    expect(termForDate(settings, '2026-08-16')?.term_id).toBe('2026-T3');
    expect(termForDate(settings, '2026-10-04')).toBeUndefined();
    expect(nextTermStartAfter(settings, '2026-09-30')).toBe('2026-10-12');
  });
});

describe('generateScheduleForSegment', () => {
  const lessons = [
    lesson('K1-L01', 'K1', 1),
    lesson('K1-L02', 'K1', 2),
    lesson('K1-L03', 'K1', 3),
  ];

  it('assigns lessons to consecutive class Sundays in cycle-sequence order', () => {
    const entries = generateScheduleForSegment('Kids', { settings, lessons });
    const lessonEntries = entries
      .filter((e) => e.entry_type === 'lesson')
      .sort((a, b) => a.date.localeCompare(b.date));
    expect(lessonEntries.map((e) => e.lesson_id)).toEqual(['K1-L01', 'K1-L02', 'K1-L03']);
    expect(lessonEntries[0].date).toBe('2026-07-26');
    expect(lessonEntries.every((e) => e.status === 'approved')).toBe(true);
  });

  it('does not place lessons on holiday Sundays and stops when lessons run out', () => {
    const entries = generateScheduleForSegment('Kids', { settings, lessons });
    // Only 3 lessons, all inside Term 3, so no breaks appear before they end.
    expect(entries.filter((e) => e.entry_type === 'break')).toHaveLength(0);
    expect(entries.filter((e) => e.entry_type === 'lesson')).toHaveLength(3);
  });

  it('marks holiday Sundays between the first and last taught Sunday as breaks', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      lesson(`K1-L${String(i + 1).padStart(2, '0')}`, 'K1', i + 1),
    );
    const entries = generateScheduleForSegment('Kids', { settings, lessons: many });
    const breaks = entries.filter((e) => e.entry_type === 'break');
    // Term 3 has 9 Sundays; lesson 10+ spills into Term 4, so the Sep/Oct
    // holiday Sundays in between become breaks carrying the next term start.
    expect(breaks.length).toBeGreaterThan(0);
    expect(breaks.some((e) => e.message?.includes('2026-10-12'))).toBe(true);
  });

  it('lets an explicit override replace the generated entry for a date', () => {
    const entries = generateScheduleForSegment('Kids', {
      settings,
      lessons,
      overrides: [
        {
          schedule_id: '2026-07-26-kids',
          date: '2026-07-26',
          segment: 'Kids',
          entry_type: 'special',
          message: 'Family service',
          status: 'approved',
        },
      ],
    });
    const first = entries.find((e) => e.date === '2026-07-26');
    expect(first?.entry_type).toBe('special');
    // Only one entry for that date/segment.
    expect(entries.filter((e) => e.date === '2026-07-26')).toHaveLength(1);
  });
});
