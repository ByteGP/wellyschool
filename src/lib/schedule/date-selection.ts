// Schedule selection rules from the build brief (section 8), extended from the
// pack's date-selection template to support content modes (ADR-011).
//
// All date comparisons use ISO `YYYY-MM-DD` strings computed in the site
// timezone, Pacific/Auckland. Never infer the current lesson from sequence
// numbers alone.
import type { ScheduleEntry } from '../../types';
import type { ContentMode } from '../content/mode';
import { isScheduleEntryPublic } from '../content/mode';
import type { Segment } from '../content/segments';

export const SITE_TIMEZONE = 'Pacific/Auckland';

/** ISO date (YYYY-MM-DD) for `now` in the given IANA timezone. */
export function dateInTimeZone(now: Date, timeZone: string = SITE_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function publicEntries(entries: ScheduleEntry[], segment: Segment, mode: ContentMode): ScheduleEntry[] {
  return entries.filter(
    (entry) => entry.segment === segment && isScheduleEntryPublic(entry, mode),
  );
}

function ascending(a: ScheduleEntry, b: ScheduleEntry): number {
  return a.date.localeCompare(b.date);
}

/**
 * Teacher rule: on a scheduled Sunday show that Sunday's entry; on other days
 * show the next scheduled entry (which may be a break or special entry).
 */
export function teacherEntry(
  entries: ScheduleEntry[],
  segment: Segment,
  today: string,
  mode: ContentMode = 'production',
): ScheduleEntry | undefined {
  return publicEntries(entries, segment, mode)
    .filter((entry) => entry.date >= today)
    .sort(ascending)[0];
}

/**
 * Family rule: show the latest entry on or before today and keep it active
 * during the following week. If no prior entry exists, fall back to the next
 * upcoming entry so families see the next available lesson date.
 */
export function familyEntry(
  entries: ScheduleEntry[],
  segment: Segment,
  today: string,
  mode: ContentMode = 'production',
): ScheduleEntry | undefined {
  const eligible = publicEntries(entries, segment, mode);
  const previous = eligible
    .filter((entry) => entry.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (previous) return previous;
  return eligible.filter((entry) => entry.date > today).sort(ascending)[0];
}

/** Next lesson-type entry strictly after `date` (used for break messaging). */
export function nextLessonEntryAfter(
  entries: ScheduleEntry[],
  segment: Segment,
  date: string,
  mode: ContentMode = 'production',
): ScheduleEntry | undefined {
  return publicEntries(entries, segment, mode)
    .filter((entry) => entry.date > date && entry.entry_type === 'lesson')
    .sort(ascending)[0];
}

/**
 * Latest lesson-type entry strictly before `date` (used for the optional
 * "review the previous lesson" link during a Family break week).
 */
export function previousLessonEntryBefore(
  entries: ScheduleEntry[],
  segment: Segment,
  date: string,
  mode: ContentMode = 'production',
): ScheduleEntry | undefined {
  return publicEntries(entries, segment, mode)
    .filter((entry) => entry.date < date && entry.entry_type === 'lesson')
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** All entries on or after `today`, soonest first (for static schedule listings). */
export function upcomingEntries(
  entries: ScheduleEntry[],
  segment: Segment,
  today: string,
  mode: ContentMode = 'production',
): ScheduleEntry[] {
  return publicEntries(entries, segment, mode)
    .filter((entry) => entry.date >= today)
    .sort(ascending);
}

/** Human-readable date for schedule display, always in the site timezone. */
export function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  // Midnight UTC is midday-ish in Pacific/Auckland (UTC+12/+13), so the civil
  // date is stable; later UTC hours would tip into the next NZ day.
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 0));
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: SITE_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(utcNoon);
}
