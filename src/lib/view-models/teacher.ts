// Teacher view model: the canonical core, Teacher content, relevant
// accessibility, and safeguarding alerts. Internal editorial data (provenance,
// review state, editor notes) and Family-only content are excluded.
import type {
  Accessibility,
  Activity,
  Claim,
  LessonContent,
  Learning,
  Passage,
  Question,
  Safeguarding,
  Teacher,
} from '../../types';

export type TeacherClaim = Omit<Claim, 'review_status'>;

export interface TeacherViewModel {
  lessonId: string;
  title: string;
  segment: LessonContent['curriculum']['segment'];
  ageRange: string;
  cycleName: string;
  sequence: number;
  bigIdea: string;
  passages: Passage[];
  metanarrativePosition: string;
  biblicalGenre: string;
  keyTerms: string[];
  claims: TeacherClaim[];
  learning: Learning;
  teacher: Teacher;
  accessibility: Accessibility;
  safeguarding: Safeguarding;
  printables: { resourceId: string; title: string; purpose: string; format: string; status: string }[];
}

export function toTeacherViewModel(lesson: LessonContent): TeacherViewModel {
  return {
    lessonId: lesson.lesson_id,
    title: lesson.curriculum.title,
    segment: lesson.curriculum.segment,
    ageRange: lesson.curriculum.age_range,
    cycleName: lesson.curriculum.cycle_name,
    sequence: lesson.curriculum.sequence,
    bigIdea: lesson.core.big_idea,
    passages: lesson.core.passages,
    metanarrativePosition: lesson.core.metanarrative_position,
    biblicalGenre: lesson.core.biblical_genre,
    keyTerms: lesson.core.key_terms ?? [],
    claims: lesson.core.claims.map(({ review_status: _reviewStatus, ...claim }) => claim),
    learning: lesson.learning,
    teacher: lesson.teacher,
    accessibility: lesson.accessibility,
    safeguarding: lesson.safeguarding,
    printables: lesson.engagement.printables.map((printable) => ({
      resourceId: printable.resource_id,
      title: printable.title,
      purpose: printable.purpose,
      format: printable.format,
      status: printable.status,
    })),
  };
}

/** Resolve outline question/activity references against the lesson's own lists. */
export function questionById(teacher: Teacher, questionId: string): Question | undefined {
  return (
    teacher.discussion_questions.find((question) => question.question_id === questionId) ??
    teacher.preparation.likely_questions.find((question) => question.question_id === questionId)
  );
}

export function activityById(teacher: Teacher, activityId: string): Activity | undefined {
  return teacher.activities.find((activity) => activity.activity_id === activityId);
}
