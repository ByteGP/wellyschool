// Flat index of every published lesson, for the calendar app's lesson-review
// and lesson-editor screens: it lists lessons, embeds each teacher page, and
// (via repoPath) tells the editor which source file to read and commit.
// Read-only, public metadata only (no teacher/editorial internals). CORS-open
// so the calendar SPA can fetch it cross-origin.
import type { APIRoute } from 'astro';
import { getLessonRepoPath, getPublicLessons } from '../lib/content/loader';
import { CONTENT_MODE } from '../lib/content/site';
import { slugFromSegment } from '../lib/content/segments';

export const GET: APIRoute = () => {
  const lessons = getPublicLessons(CONTENT_MODE)
    .map((lesson) => {
      const slug = slugFromSegment(lesson.curriculum.segment);
      return {
        lessonId: lesson.lesson_id,
        segment: lesson.curriculum.segment,
        segmentSlug: slug,
        cycleId: lesson.curriculum.cycle_id,
        cycleName: lesson.curriculum.cycle_name,
        sequence: lesson.curriculum.sequence,
        title: lesson.curriculum.title,
        teacherPath: `/teacher/${slug}/${lesson.lesson_id.toLowerCase()}/`,
        repoPath: getLessonRepoPath(lesson.lesson_id),
      };
    })
    .sort(
      (a, b) =>
        a.segmentSlug.localeCompare(b.segmentSlug) ||
        a.cycleId.localeCompare(b.cycleId) ||
        a.sequence - b.sequence,
    );

  return new Response(`${JSON.stringify(lessons, null, 2)}\n`, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
