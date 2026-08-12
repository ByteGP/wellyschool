// Static content loaders. These run at build time only (Astro frontmatter);
// client islands must receive sanitized view models, never these objects.
import type { LessonContent, PrintableResource, ScheduleEntry, SiteSettings } from '../../types';
import type { ContentMode } from './mode';
import { isLessonPublic } from './mode';
import type { Segment } from './segments';

const lessonModules = import.meta.glob('/src/content/lessons/**/*.json', {
  eager: true,
  import: 'default',
});
const resourceModules = import.meta.glob('/src/content/resources/*.json', {
  eager: true,
  import: 'default',
});
const scheduleModules = import.meta.glob('/src/content/schedule/*.json', {
  eager: true,
  import: 'default',
});
import siteSettings from '../../content/settings/site.json';

const lessons = Object.values(lessonModules) as LessonContent[];
const resources = Object.values(resourceModules) as PrintableResource[];
const scheduleEntries = Object.values(scheduleModules) as ScheduleEntry[];

const lessonById = new Map(lessons.map((lesson) => [lesson.lesson_id, lesson]));
const resourceById = new Map(resources.map((resource) => [resource.resource_id, resource]));

export function getAllLessons(): LessonContent[] {
  return [...lessons];
}

export function getPublicLessons(mode: ContentMode): LessonContent[] {
  return lessons.filter((lesson) => isLessonPublic(lesson, mode));
}

export function getPublicLessonsBySegment(segment: Segment, mode: ContentMode): LessonContent[] {
  return getPublicLessons(mode)
    .filter((lesson) => lesson.curriculum.segment === segment)
    .sort((a, b) => a.curriculum.sequence - b.curriculum.sequence);
}

export function getLessonById(lessonId: string): LessonContent | undefined {
  return lessonById.get(lessonId);
}

export function getPublicLessonById(lessonId: string, mode: ContentMode): LessonContent | undefined {
  const lesson = lessonById.get(lessonId);
  return lesson && isLessonPublic(lesson, mode) ? lesson : undefined;
}

export function getAllResources(): PrintableResource[] {
  return [...resources];
}

export function getResourceById(resourceId: string): PrintableResource | undefined {
  return resourceById.get(resourceId);
}

export function getScheduleEntries(): ScheduleEntry[] {
  return [...scheduleEntries];
}

export function getSiteSettings(): SiteSettings {
  return siteSettings as SiteSettings;
}
