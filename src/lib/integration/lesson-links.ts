// Calendar integration surface (loosely coupled, read-only).
//
// The church calendar (calendar.wellingtoncoc.com) sends each Sunday School
// teacher a reminder. This module lets the lesson site expose, per (date,
// class), which prepared lesson is scheduled and where to find it, so the
// reminder can link straight to that week's lesson and its "Prepare before
// class" section.
//
// It reuses the site's own effective schedule (ADR-013), so the (date, class)
// -> lesson mapping stays a single source of truth here. Nothing is written
// back; the calendar only ever reads.
import type { ContentMode } from '../content/mode';
import { getEffectiveSchedule, getPublicLessonById } from '../content/loader';
import { slugFromSegment, type SegmentSlug } from '../content/segments';

export interface LessonLink {
  /** ISO date (YYYY-MM-DD), the civil Sunday in Pacific/Auckland. */
  date: string;
  /** Lesson-site class slug: kids | youths | teens. */
  class: SegmentSlug;
  lessonId: string;
  title: string;
  /** All passage references joined, matching the teacher page header. */
  passages: string;
  bigIdea: string;
  /** Site-relative path to the lesson (origin added by the caller). */
  lessonPath: string;
  /** Site-relative path deep-linking to the Prepare-before-class section. */
  preparePath: string;
}

/**
 * The scheduled, resolvable lesson links for the given content mode, one per
 * lesson-type schedule entry whose lesson is public in that mode. Break and
 * special entries (and any entry whose lesson is not public) are skipped.
 */
export function getLessonLinks(mode: ContentMode): LessonLink[] {
  const links: LessonLink[] = [];
  for (const entry of getEffectiveSchedule(mode)) {
    if (entry.entry_type !== 'lesson' || !entry.lesson_id) continue;
    const lesson = getPublicLessonById(entry.lesson_id, mode);
    if (!lesson) continue;
    const slug = slugFromSegment(lesson.curriculum.segment);
    const lessonPath = `/teacher/${slug}/${lesson.lesson_id.toLowerCase()}/`;
    links.push({
      date: entry.date,
      class: slug,
      lessonId: lesson.lesson_id,
      title: lesson.curriculum.title,
      passages: lesson.core.passages.map((passage) => passage.reference).join('; '),
      bigIdea: lesson.core.big_idea,
      lessonPath,
      preparePath: `${lessonPath}#prepare`,
    });
  }
  return links.sort(
    (a, b) => a.date.localeCompare(b.date) || a.class.localeCompare(b.class),
  );
}
