import { describe, expect, it } from 'vitest';
import type { ScheduleEntry } from '../../src/types';
import {
  dateInTimeZone,
  familyEntry,
  formatDisplayDate,
  nextLessonEntryAfter,
  previousLessonEntryBefore,
  teacherEntry,
  upcomingEntries,
} from '../../src/lib/schedule/date-selection';

const entry = (overrides: Partial<ScheduleEntry> & { date: string }): ScheduleEntry => ({
  schedule_id: `${overrides.date}-kids`,
  segment: 'Kids',
  entry_type: 'lesson',
  lesson_id: 'K1-L19',
  status: 'approved',
  ...overrides,
});

describe('dateInTimeZone', () => {
  it('converts UTC instants into the Pacific/Auckland civil date', () => {
    // 13:00 UTC on 12 Aug is 01:00 on 13 Aug in NZST (UTC+12).
    expect(dateInTimeZone(new Date('2026-08-12T13:00:00Z'))).toBe('2026-08-13');
    // 11:00 UTC on 12 Aug is 23:00 on 12 Aug in NZST.
    expect(dateInTimeZone(new Date('2026-08-12T11:00:00Z'))).toBe('2026-08-12');
  });

  it('handles the NZ daylight-saving window (UTC+13)', () => {
    // 11:30 UTC on 24 Dec is 00:30 on 25 Dec in NZDT (UTC+13).
    expect(dateInTimeZone(new Date('2026-12-24T11:30:00Z'))).toBe('2026-12-25');
    expect(dateInTimeZone(new Date('2026-12-24T10:30:00Z'))).toBe('2026-12-24');
  });
});

describe('teacherEntry', () => {
  const schedule: ScheduleEntry[] = [
    entry({ date: '2026-08-09' }),
    entry({ date: '2026-08-16', lesson_id: 'K5-L13' }),
    entry({ date: '2026-08-23', entry_type: 'break', lesson_id: undefined, message: 'Holidays' }),
    entry({ date: '2026-08-30', lesson_id: 'K1-L19' }),
  ];

  it('selects the same-day entry on a scheduled Sunday', () => {
    expect(teacherEntry(schedule, 'Kids', '2026-08-16')?.date).toBe('2026-08-16');
  });

  it('selects the next upcoming entry on other days', () => {
    expect(teacherEntry(schedule, 'Kids', '2026-08-10')?.date).toBe('2026-08-16');
  });

  it('returns break entries so the route can show the break message', () => {
    const selected = teacherEntry(schedule, 'Kids', '2026-08-17');
    expect(selected?.entry_type).toBe('break');
    expect(nextLessonEntryAfter(schedule, 'Kids', selected!.date)?.date).toBe('2026-08-30');
  });

  it('ignores other segments and non-approved entries in production mode', () => {
    const mixed = [
      entry({ date: '2026-08-16', segment: 'Teens', schedule_id: '2026-08-16-teens' }),
      entry({ date: '2026-08-23', status: 'draft' }),
      entry({ date: '2026-08-30' }),
    ];
    expect(teacherEntry(mixed, 'Kids', '2026-08-12')?.date).toBe('2026-08-30');
  });

  it('includes draft entries in preview mode but never cancelled ones', () => {
    const mixed = [
      entry({ date: '2026-08-16', status: 'draft' }),
      entry({ date: '2026-08-23', status: 'cancelled' }),
    ];
    expect(teacherEntry(mixed, 'Kids', '2026-08-12', 'preview')?.date).toBe('2026-08-16');
    expect(teacherEntry(mixed, 'Kids', '2026-08-17', 'preview')).toBeUndefined();
  });

  it('returns undefined when nothing is scheduled', () => {
    expect(teacherEntry([], 'Kids', '2026-08-12')).toBeUndefined();
  });
});

describe('familyEntry', () => {
  const schedule: ScheduleEntry[] = [
    entry({ date: '2026-08-09' }),
    entry({ date: '2026-08-16', lesson_id: 'K5-L13' }),
    entry({ date: '2026-08-23', entry_type: 'break', lesson_id: undefined, message: 'Holidays' }),
  ];

  it('selects the latest entry on or before today', () => {
    expect(familyEntry(schedule, 'Kids', '2026-08-16')?.date).toBe('2026-08-16');
    expect(familyEntry(schedule, 'Kids', '2026-08-20')?.date).toBe('2026-08-16');
  });

  it('keeps the lesson active during the following week', () => {
    expect(familyEntry(schedule, 'Kids', '2026-08-22')?.lesson_id).toBe('K5-L13');
  });

  it('returns the break entry during a break week with a previous-lesson link available', () => {
    const selected = familyEntry(schedule, 'Kids', '2026-08-25');
    expect(selected?.entry_type).toBe('break');
    expect(previousLessonEntryBefore(schedule, 'Kids', selected!.date)?.lesson_id).toBe('K5-L13');
  });

  it('falls back to the next upcoming entry when no prior lesson exists', () => {
    expect(familyEntry(schedule, 'Kids', '2026-08-01')?.date).toBe('2026-08-09');
  });

  it('returns undefined when nothing is scheduled at all', () => {
    expect(familyEntry([], 'Kids', '2026-08-12')).toBeUndefined();
  });
});

describe('upcomingEntries', () => {
  it('lists entries from today onward, soonest first', () => {
    const schedule = [entry({ date: '2026-08-30' }), entry({ date: '2026-08-16' }), entry({ date: '2026-08-02' })];
    expect(upcomingEntries(schedule, 'Kids', '2026-08-12').map((e) => e.date)).toEqual([
      '2026-08-16',
      '2026-08-30',
    ]);
  });
});

describe('formatDisplayDate', () => {
  it('formats the civil date without timezone drift', () => {
    expect(formatDisplayDate('2026-08-16')).toBe('Sunday, 16 August 2026');
    // During NZDT too.
    expect(formatDisplayDate('2026-12-27')).toBe('Sunday, 27 December 2026');
  });
});
