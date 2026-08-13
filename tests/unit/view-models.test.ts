import { describe, expect, it } from 'vitest';
import lessonJson from '../../src/content/lessons/kids/k1-l19_jesus_calms_the_storm.json';
import type { LessonContent } from '../../src/types';
import { toFamilyViewModel } from '../../src/lib/view-models/family';
import { toTeacherViewModel } from '../../src/lib/view-models/teacher';
import { toPrintFamilyViewModel, toPrintTeacherViewModel } from '../../src/lib/view-models/print';

const lesson = lessonJson as unknown as LessonContent;

describe('toTeacherViewModel', () => {
  const vm = toTeacherViewModel(lesson);

  it('carries the canonical core and teacher content', () => {
    expect(vm.lessonId).toBe('K1-L19');
    expect(vm.bigIdea).toContain('authority');
    expect(vm.teacher.zero_prep_card.read).toBe('Mark 4:35-41');
    expect(vm.teacher.delivery_profiles.standard.duration_minutes).toBe(35);
    expect(vm.safeguarding.do_not_ask.length).toBeGreaterThan(0);
    expect(vm.accessibility.neurodiversity_supports.length).toBeGreaterThan(0);
  });

  it('excludes editorial data and claim review status', () => {
    const serialized = JSON.stringify(vm);
    expect(serialized).not.toContain('source_provenance');
    expect(serialized).not.toContain('review_state');
    expect(serialized).not.toContain('editor_notes');
    expect(serialized).not.toContain('review_status');
    expect(serialized).not.toContain('Canonical Curriculum Matrix');
  });
});

describe('toFamilyViewModel', () => {
  const vm = toFamilyViewModel(lesson);

  it('carries the family flow, quiz, puzzle, and parent guidance', () => {
    expect(vm.flow.map((step) => step.type)).toEqual([
      'connect',
      'read',
      'understand',
      'play',
      'respond',
    ]);
    expect(vm.durationMinutes).toBe(15);
    expect(vm.quiz.length).toBeGreaterThanOrEqual(3);
    expect(vm.puzzle.type).toBeTruthy();
    // Parent note is carried through verbatim from the lesson (content-agnostic).
    expect(vm.parentNote).toBe(lesson.family.parent_note);
    expect(vm.parentNote.length).toBeGreaterThan(0);
    expect(vm.weeklyAction.length).toBeGreaterThan(0);
    expect(vm.prayer.length).toBeGreaterThan(0);
  });

  it('is a redaction boundary: no teacher preparation, editorial, claims, or safeguarding internals', () => {
    const serialized = JSON.stringify(vm);
    // Teacher-only content.
    expect(serialized).not.toContain('zero_prep_card');
    expect(serialized).not.toContain(lesson.teacher.preparation.passage_context);
    expect(serialized).not.toContain(lesson.teacher.preparation.theological_guardrails[0]);
    // Editorial internals.
    expect(serialized).not.toContain('source_provenance');
    expect(serialized).not.toContain('review_state');
    expect(serialized).not.toContain('Decision Register');
    // Claims and their alternatives.
    expect(serialized).not.toContain('classification');
    expect(serialized).not.toContain('prohibited_overstatement');
    // Safeguarding internals.
    expect(serialized).not.toContain('escalation');
    expect(serialized).not.toContain(lesson.safeguarding.teacher_response);
  });
});

describe('print view models', () => {
  it('teacher print carries the selected profile only', () => {
    const vm = toPrintTeacherViewModel(lesson, 'essential');
    expect(vm.durationMinutes).toBe(25);
    expect(vm.outline.reduce((sum, step) => sum + step.minutes, 0)).toBe(25);
    // Outline references resolve to human-readable text.
    const withQuestions = vm.outline.find((step) => step.questions.length > 0);
    expect(withQuestions?.questions[0]).toMatch(/\?$/);
    // Only referenced activities are included.
    expect(vm.activities.map((activity) => activity.activity_id)).toEqual(['A01']);
    const serialized = JSON.stringify(vm);
    expect(serialized).not.toContain('review_state');
    expect(serialized).not.toContain('likely_questions');
  });

  it('family print carries the five steps and family guidance only', () => {
    const vm = toPrintFamilyViewModel(lesson);
    expect(vm.flow).toHaveLength(5);
    expect(vm.questions.length).toBeGreaterThanOrEqual(2);
    const serialized = JSON.stringify(vm);
    expect(serialized).not.toContain('zero_prep');
    expect(serialized).not.toContain('guardrail');
    expect(serialized).not.toContain('provenance');
  });
});
