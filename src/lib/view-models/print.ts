// Print view models contain only print-required data.
import type { Activity, LessonContent, Teacher } from '../../types';
import { activityById, questionById } from './teacher';

export type ProfileName = 'essential' | 'standard' | 'extended';
export const PROFILE_NAMES: readonly ProfileName[] = ['essential', 'standard', 'extended'];

export interface PrintOutlineStep {
  stepId: string;
  minutes: number;
  label: string;
  instructions: string;
  questions: string[];
  activities: string[];
  resources: string[];
}

export interface PrintTeacherViewModel {
  lessonId: string;
  title: string;
  segment: string;
  ageRange: string;
  bigIdea: string;
  passages: string[];
  profileName: ProfileName;
  profileLabel: string;
  durationMinutes: number;
  zeroPrepCard: Teacher['zero_prep_card'];
  outline: PrintOutlineStep[];
  activities: Activity[];
  closing: Teacher['closing'];
}

export function toPrintTeacherViewModel(
  lesson: LessonContent,
  profileName: ProfileName,
): PrintTeacherViewModel {
  const profile = lesson.teacher.delivery_profiles[profileName];
  const referencedActivityIds = new Set(
    profile.outline.flatMap((step) => step.activity_refs ?? []),
  );
  return {
    lessonId: lesson.lesson_id,
    title: lesson.curriculum.title,
    segment: lesson.curriculum.segment,
    ageRange: lesson.curriculum.age_range,
    bigIdea: lesson.core.big_idea,
    passages: lesson.core.passages.map((passage) => passage.reference),
    profileName,
    profileLabel: profile.label,
    durationMinutes: profile.duration_minutes,
    zeroPrepCard: lesson.teacher.zero_prep_card,
    outline: profile.outline.map((step) => ({
      stepId: step.step_id,
      minutes: step.minutes,
      label: step.label,
      instructions: step.instructions,
      questions: (step.question_refs ?? [])
        .map((ref) => questionById(lesson.teacher, ref)?.question)
        .filter((question): question is string => Boolean(question)),
      activities: (step.activity_refs ?? [])
        .map((ref) => activityById(lesson.teacher, ref)?.title)
        .filter((title): title is string => Boolean(title)),
      resources: step.resource_refs ?? [],
    })),
    activities: lesson.teacher.activities.filter((activity) =>
      referencedActivityIds.has(activity.activity_id),
    ),
    closing: lesson.teacher.closing,
  };
}

export interface PrintFamilyViewModel {
  lessonId: string;
  lessonTitle: string;
  familyTitle: string;
  segment: string;
  bigIdea: string;
  passages: string[];
  durationMinutes: number;
  parentIntro: string;
  flow: { type: string; durationMinutes: number; instructions: string }[];
  questions: string[];
  weeklyAction: string;
  prayer: string;
  parentNote: string;
}

export function toPrintFamilyViewModel(lesson: LessonContent): PrintFamilyViewModel {
  return {
    lessonId: lesson.lesson_id,
    lessonTitle: lesson.curriculum.title,
    familyTitle: lesson.family.title,
    segment: lesson.curriculum.segment,
    bigIdea: lesson.core.big_idea,
    passages: lesson.core.passages.map((passage) => passage.reference),
    durationMinutes: lesson.family.duration_minutes,
    parentIntro: lesson.family.parent_intro,
    flow: lesson.family.flow.map((step) => ({
      type: step.type,
      durationMinutes: step.duration_minutes,
      instructions: step.instructions,
    })),
    questions: lesson.family.questions,
    weeklyAction: lesson.family.weekly_action,
    prayer: lesson.family.prayer,
    parentNote: lesson.family.parent_note,
  };
}
