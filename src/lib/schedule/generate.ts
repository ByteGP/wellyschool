// Auto-generates the teaching schedule from school-term dates and each
// segment's lesson sequence (ADR-013):
//
//   - Lessons are assigned in cycle-then-sequence order, one per term-time
//     Sunday, starting at the first term Sunday.
//   - Holiday Sundays that fall inside the active teaching span become `break`
//     entries carrying the next term's start date.
//   - Explicit schedule entries (from Decap `src/content/schedule`) override the
//     generated entry for the same date + segment, so a special Sunday or a
//     manual swap always wins.
//
// The result is a plain ScheduleEntry[] consumed by the existing date-selection
// rules, so the current-lesson logic is unchanged.
import type { LessonContent, ScheduleEntry } from '../../types';
import type { Segment } from '../content/segments';
import { classSundays, nextTermStartAfter, termForDate, type TermSettings } from './terms';

const SEGMENTS: Segment[] = ['Kids', 'Youths', 'Teens'];

function slug(segment: Segment): string {
  return segment.toLowerCase();
}

/** Lessons in the order they should be taught: cycle id, then sequence. */
function orderedLessons(lessons: LessonContent[], segment: Segment): LessonContent[] {
  return lessons
    .filter((lesson) => lesson.curriculum.segment === segment)
    .sort(
      (a, b) =>
        a.curriculum.cycle_id.localeCompare(b.curriculum.cycle_id) ||
        a.curriculum.sequence - b.curriculum.sequence,
    );
}

export interface GenerateOptions {
  settings: TermSettings;
  /** Public lessons for the active content mode. */
  lessons: LessonContent[];
  /** Explicit schedule entries that override generated ones (date + segment). */
  overrides?: ScheduleEntry[];
}

/**
 * Generate schedule entries for one segment. Lesson entries fill the first N
 * class Sundays (N = number of lessons); holiday Sundays inside that span
 * become breaks. Generated entries are `approved` so they drive both preview
 * and production selection (the lessons themselves still gate visibility).
 */
export function generateScheduleForSegment(
  segment: Segment,
  options: GenerateOptions,
): ScheduleEntry[] {
  const { settings, lessons } = options;
  const sundays = classSundays(settings);
  const ordered = orderedLessons(lessons, segment);
  if (sundays.length === 0 || ordered.length === 0) return [];

  const assignedCount = Math.min(sundays.length, ordered.length);
  const lastTaughtSunday = sundays[assignedCount - 1];
  const firstSunday = sundays[0];

  const entries: ScheduleEntry[] = [];

  // Lesson entries on class Sundays.
  for (let i = 0; i < assignedCount; i += 1) {
    const date = sundays[i];
    entries.push({
      schedule_id: `${date}-${slug(segment)}`,
      date,
      segment,
      entry_type: 'lesson',
      lesson_id: ordered[i].lesson_id,
      status: 'approved',
    });
  }

  // Break entries on holiday Sundays inside the active teaching span.
  const breakBase = settings.break_message ?? 'School holidays: no Sunday School classes this week.';
  let cursor = firstSunday;
  while (cursor < lastTaughtSunday) {
    // Step to the next Sunday.
    const [y, m, d] = cursor.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d, 12));
    next.setUTCDate(next.getUTCDate() + 7);
    cursor = next.toISOString().slice(0, 10);
    if (cursor >= lastTaughtSunday) break;
    if (!termForDate(settings, cursor)) {
      const resumes = nextTermStartAfter(settings, cursor);
      entries.push({
        schedule_id: `${cursor}-${slug(segment)}`,
        date: cursor,
        segment,
        entry_type: 'break',
        message: resumes
          ? `${breakBase} Classes start again on ${resumes}.`
          : breakBase,
        status: 'approved',
      });
    }
  }

  return applyOverrides(entries, segment, options.overrides ?? []);
}

/** Explicit entries for the same date + segment replace generated ones. */
function applyOverrides(
  generated: ScheduleEntry[],
  segment: Segment,
  overrides: ScheduleEntry[],
): ScheduleEntry[] {
  const relevant = overrides.filter((entry) => entry.segment === segment);
  if (relevant.length === 0) return generated;
  const overrideKeys = new Set(relevant.map((entry) => entry.date));
  const kept = generated.filter((entry) => !overrideKeys.has(entry.date));
  return [...kept, ...relevant].sort((a, b) => a.date.localeCompare(b.date));
}

/** Generate entries for every segment (used to build the whole schedule). */
export function generateSchedule(options: GenerateOptions): ScheduleEntry[] {
  return SEGMENTS.flatMap((segment) => generateScheduleForSegment(segment, options));
}
