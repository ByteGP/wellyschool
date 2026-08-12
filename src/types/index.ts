// Stable import surface over the generated schema types.
// `LessonContent` is the name used throughout the app for the canonical lesson.
export type {
  SundaySchoolCanonicalLessonContent as LessonContent,
  Curriculum,
  Core,
  Passage,
  Claim,
  Learning,
  Teacher,
  Question,
  Activity,
  DeliveryProfile,
  OutlineStep,
  Family,
  FamilyFlowStep,
  Engagement,
  QuizQuestion,
  QuizAnswer,
  PuzzleSolution,
  PuzzlePair,
  PuzzleGroup,
  Accessibility,
  Safeguarding,
  Editorial,
} from './lesson.generated';
export type { PrintableResource } from './resource.generated';
export type { ScheduleEntry } from './schedule-entry.generated';
export type { SiteSettings } from './site-settings.generated';
