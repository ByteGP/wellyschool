// Pure helpers for the shared teaching log (ADR-013, Phase B). No I/O here so
// the rules are unit-testable; the Netlify Function and client island import
// these. The log records what actually happened each Sunday: the planned lesson
// taught, a different lesson taught (swap), or no class.
export type TeachingStatus = 'taught' | 'not_taught' | 'swapped';

export const TEACHING_STATUSES: readonly TeachingStatus[] = ['taught', 'not_taught', 'swapped'];

export type SegmentName = 'Kids' | 'Youths' | 'Teens';
const SEGMENTS: readonly SegmentName[] = ['Kids', 'Youths', 'Teens'];

export interface TeachingLogEntry {
  date: string;
  segment: SegmentName;
  status: TeachingStatus;
  /** For a swap: the lesson actually taught instead of the planned one. */
  actual_lesson_id?: string;
  note?: string;
  updated_at: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LESSON_ID = /^[KYT][1-5]-L[0-9]{2}$/;

/** Storage key for one date + segment. */
export function logKey(date: string, segment: SegmentName): string {
  return `${date}__${segment}`;
}

export interface UpdateInput {
  date?: unknown;
  segment?: unknown;
  status?: unknown;
  actual_lesson_id?: unknown;
  note?: unknown;
}

export type ValidationResult =
  | { ok: true; entry: Omit<TeachingLogEntry, 'updated_at'> }
  | { ok: false; error: string };

/** Validate and normalize a client update payload (no timestamp yet). */
export function validateUpdate(input: UpdateInput): ValidationResult {
  const { date, segment, status } = input;
  if (typeof date !== 'string' || !ISO_DATE.test(date)) {
    return { ok: false, error: 'date must be YYYY-MM-DD' };
  }
  if (typeof segment !== 'string' || !SEGMENTS.includes(segment as SegmentName)) {
    return { ok: false, error: 'segment must be Kids, Youths, or Teens' };
  }
  if (typeof status !== 'string' || !TEACHING_STATUSES.includes(status as TeachingStatus)) {
    return { ok: false, error: 'status must be taught, not_taught, or swapped' };
  }
  const entry: Omit<TeachingLogEntry, 'updated_at'> = {
    date,
    segment: segment as SegmentName,
    status: status as TeachingStatus,
  };
  if (status === 'swapped') {
    if (typeof input.actual_lesson_id !== 'string' || !LESSON_ID.test(input.actual_lesson_id)) {
      return { ok: false, error: 'a swap requires a valid actual_lesson_id (e.g. K1-L07)' };
    }
    entry.actual_lesson_id = input.actual_lesson_id;
  }
  if (input.note !== undefined) {
    if (typeof input.note !== 'string' || input.note.length > 500) {
      return { ok: false, error: 'note must be text under 500 characters' };
    }
    if (input.note.trim().length > 0) entry.note = input.note.trim();
  }
  return { ok: true, entry };
}

/** Constant-time-ish passcode comparison (length-guarded equality). */
export function passcodeMatches(supplied: unknown, expected: string | undefined): boolean {
  if (!expected) return false; // No passcode configured means writes are refused.
  if (typeof supplied !== 'string' || supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
