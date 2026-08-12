import type { LessonContent, ScheduleEntry } from '../../types';

/**
 * Build-time content mode (ADR-011).
 *
 * - `production` (default): only approved-or-later lessons and approved schedule
 *   entries are rendered. Production must never expose drafts.
 * - `preview`: Deploy Previews / pilot builds additionally render draft seed
 *   content so the team can test the six seed lessons end-to-end.
 *
 * The mode is resolved once at build time and baked into the static output.
 */
export type ContentMode = 'production' | 'preview';

export type LessonStatus = LessonContent['status'];
export type ScheduleStatus = ScheduleEntry['status'];

const PUBLIC_LESSON_STATUSES: Record<ContentMode, readonly LessonStatus[]> = {
  production: ['approved', 'scheduled', 'published'],
  preview: ['vertical_slice_draft', 'in_review', 'approved', 'scheduled', 'published'],
};

const PUBLIC_SCHEDULE_STATUSES: Record<ContentMode, readonly ScheduleStatus[]> = {
  production: ['approved'],
  preview: ['draft', 'approved'],
};

export function resolveContentMode(raw: string | undefined): ContentMode {
  if (raw === 'preview') return 'preview';
  if (raw === 'production' || raw === undefined || raw === '') return 'production';
  throw new Error(`Unknown CONTENT_MODE "${raw}"; expected "production" or "preview".`);
}

export function allowedLessonStatuses(mode: ContentMode): readonly LessonStatus[] {
  return PUBLIC_LESSON_STATUSES[mode];
}

export function allowedScheduleStatuses(mode: ContentMode): readonly ScheduleStatus[] {
  return PUBLIC_SCHEDULE_STATUSES[mode];
}

export function isLessonPublic(lesson: LessonContent, mode: ContentMode): boolean {
  return allowedLessonStatuses(mode).includes(lesson.status);
}

export function isScheduleEntryPublic(entry: ScheduleEntry, mode: ContentMode): boolean {
  return allowedScheduleStatuses(mode).includes(entry.status);
}
