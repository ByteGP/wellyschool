// Family view model: title, passage references, big idea, Family flow, quiz
// and puzzle data, parent note, and family action — nothing else.
//
// Explicitly excluded (brief section 6): Teacher preparation, review state,
// claim alternatives, safeguarding internals, and source provenance. This
// object is serialized into client islands, so the exclusions are a privacy
// boundary, not a styling preference.
import type { FamilyFlowStep, LessonContent } from '../../types';
import type { PreparedPuzzle, PreparedQuizQuestion } from './engagement';
import { prepareQuiz, preparePuzzle } from './engagement';

export interface FamilyViewModel {
  lessonId: string;
  lessonTitle: string;
  familyTitle: string;
  segment: LessonContent['curriculum']['segment'];
  bigIdea: string;
  passages: { reference: string; role: string; readingNote?: string }[];
  durationMinutes: number;
  parentIntro: string;
  flow: FamilyFlowStep[];
  questions: string[];
  interactive: { type: string; title: string; instructions: string };
  quiz: PreparedQuizQuestion[];
  puzzle: PreparedPuzzle;
  weeklyAction: string;
  prayer: string;
  parentNote: string;
}

export function toFamilyViewModel(lesson: LessonContent): FamilyViewModel {
  return {
    lessonId: lesson.lesson_id,
    lessonTitle: lesson.curriculum.title,
    familyTitle: lesson.family.title,
    segment: lesson.curriculum.segment,
    bigIdea: lesson.core.big_idea,
    passages: lesson.core.passages.map((passage) => ({
      reference: passage.reference,
      role: passage.role,
      ...(passage.reading_note !== undefined ? { readingNote: passage.reading_note } : {}),
    })),
    durationMinutes: lesson.family.duration_minutes,
    parentIntro: lesson.family.parent_intro,
    flow: lesson.family.flow,
    questions: lesson.family.questions,
    interactive: lesson.family.interactive,
    quiz: prepareQuiz(lesson.engagement.quiz),
    puzzle: preparePuzzle(lesson.engagement.puzzle),
    weeklyAction: lesson.family.weekly_action,
    prayer: lesson.family.prayer,
    parentNote: lesson.family.parent_note,
  };
}
