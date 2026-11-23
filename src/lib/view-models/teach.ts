// Teach view model: everything a teacher needs on screen during class, with the
// outline's question, activity, and printable references already resolved.
//
// Like the Teacher view model, this carries no editorial data (provenance,
// review state, editor notes) and no preparation notes: those belong on the
// lesson page, before class. Unit tests enforce the exclusions.
import type { LessonContent } from '../../types';
import { slugFromSegment, type SegmentSlug } from '../content/segments';
import { activityById, questionById } from './teacher';

export type TeachProfileName = 'essential' | 'standard' | 'extended';

export const TEACH_PROFILE_NAMES: readonly TeachProfileName[] = [
  'essential',
  'standard',
  'extended',
];

export interface TeachQuestion {
  question: string;
  simple?: string;
  deeper?: string;
}

export interface TeachActivity {
  title: string;
  minutes: number;
  materials: string[];
  steps: string[];
  lowResource?: string;
}

export interface TeachResource {
  id: string;
  title: string;
  /** Print view for the resource, when one exists. */
  href?: string;
}

export interface TeachStep {
  stepId: string;
  minutes: number;
  label: string;
  instructions: string;
  questions: TeachQuestion[];
  activities: TeachActivity[];
  resources: TeachResource[];
}

export interface TeachProfile {
  name: TeachProfileName;
  label: string;
  minutes: number;
  steps: TeachStep[];
}

export interface TeachViewModel {
  lessonId: string;
  title: string;
  segment: LessonContent['curriculum']['segment'];
  segmentSlug: SegmentSlug;
  ageRange: string;
  sequence: number;
  bigIdea: string;
  passages: string;
  goal: string;
  read: string;
  opening: string;
  say: string[];
  materials: string[];
  profiles: TeachProfile[];
  closing: { memoryReference: string; prayerPrompt: string; takeHomeLine: string };
  safeguarding: {
    doNotAsk: string[];
    teacherResponse: string;
    escalationRequired: boolean;
    escalationNote?: string;
  };
  lessonHref: string;
}

/**
 * @param hasResource whether a print view exists for a resource id. Passed in so
 *   this module stays free of the content loader and its file-system reads.
 */
export function toTeachViewModel(
  lesson: LessonContent,
  hasResource: (resourceId: string) => boolean,
): TeachViewModel {
  const teacher = lesson.teacher;
  const segmentSlug = slugFromSegment(lesson.curriculum.segment);
  const printableTitles = new Map(
    lesson.engagement.printables.map((printable) => [printable.resource_id, printable.title]),
  );

  const profiles: TeachProfile[] = TEACH_PROFILE_NAMES.map((name) => {
    const profile = teacher.delivery_profiles[name];
    return {
      name,
      label: profile.label,
      minutes: profile.duration_minutes,
      steps: profile.outline.map((step) => ({
        stepId: step.step_id,
        minutes: step.minutes,
        label: step.label,
        instructions: step.instructions,
        questions: (step.question_refs ?? []).flatMap((ref) => {
          const question = questionById(teacher, ref);
          return question
            ? [
                {
                  question: question.question,
                  simple: question.foundation_prompt,
                  deeper: question.extension_prompt,
                },
              ]
            : [];
        }),
        activities: (step.activity_refs ?? []).flatMap((ref) => {
          const activity = activityById(teacher, ref);
          return activity
            ? [
                {
                  title: activity.title,
                  minutes: activity.duration_minutes,
                  materials: [...activity.materials],
                  steps: [...activity.steps],
                  lowResource: activity.low_resource_alternative,
                },
              ]
            : [];
        }),
        resources: (step.resource_refs ?? []).map((id) => ({
          id,
          title: printableTitles.get(id) ?? id,
          href: hasResource(id) ? `/print/resource/${id.toLowerCase()}/` : undefined,
        })),
      })),
    };
  });

  return {
    lessonId: lesson.lesson_id,
    title: lesson.curriculum.title,
    segment: lesson.curriculum.segment,
    segmentSlug,
    ageRange: lesson.curriculum.age_range,
    sequence: lesson.curriculum.sequence,
    bigIdea: lesson.core.big_idea,
    passages: lesson.core.passages.map((passage) => passage.reference).join('; '),
    goal: teacher.zero_prep_card.objective,
    read: teacher.zero_prep_card.read,
    opening: teacher.zero_prep_card.opening,
    say: [...teacher.zero_prep_card.say],
    materials: [...teacher.zero_prep_card.materials],
    profiles,
    closing: {
      memoryReference: teacher.closing.memory_reference,
      prayerPrompt: teacher.closing.prayer_prompt,
      takeHomeLine: teacher.closing.take_home_line,
    },
    safeguarding: {
      doNotAsk: [...lesson.safeguarding.do_not_ask],
      teacherResponse: lesson.safeguarding.teacher_response,
      escalationRequired: lesson.safeguarding.escalation_required,
      escalationNote: lesson.safeguarding.escalation_note,
    },
    lessonHref: `/teacher/${segmentSlug}/${lesson.lesson_id.toLowerCase()}/`,
  };
}
