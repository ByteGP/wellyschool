import { describe, expect, it } from 'vitest';
import lessonJson from '../../src/content/lessons/kids/k1-l19_jesus_calms_the_storm.json';
import {
  enterStep,
  formatClock,
  isTeachClock,
  lessonElapsed,
  MINUTE,
  pace,
  paceLabel,
  pauseClock,
  resumeClock,
  spokenClock,
  startClock,
  stepTime,
} from '../../src/lib/teach/clock';
import { toTeachViewModel } from '../../src/lib/view-models/teach';
import type { LessonContent } from '../../src/types';

const lesson = lessonJson as unknown as LessonContent;
const T0 = 1_800_000_000_000;

describe('teach clock', () => {
  it('counts teaching time and leaves pauses out', () => {
    let clock = startClock(T0);
    expect(lessonElapsed(clock, T0 + 3 * MINUTE)).toBe(3 * MINUTE);
    clock = pauseClock(clock, T0 + 3 * MINUTE);
    expect(lessonElapsed(clock, T0 + 10 * MINUTE)).toBe(3 * MINUTE);
    clock = resumeClock(clock, T0 + 10 * MINUTE);
    expect(lessonElapsed(clock, T0 + 12 * MINUTE)).toBe(5 * MINUTE);
  });

  it('pausing twice or resuming a running clock changes nothing', () => {
    const running = startClock(T0);
    expect(resumeClock(running, T0 + MINUTE)).toBe(running);
    const paused = pauseClock(running, T0 + MINUTE);
    expect(pauseClock(paused, T0 + 2 * MINUTE)).toBe(paused);
  });

  it('never reports negative teaching time if the device clock moves back', () => {
    expect(lessonElapsed(startClock(T0), T0 - MINUTE)).toBe(0);
  });

  it('starts each step from zero and shows when it runs over', () => {
    let clock = startClock(T0);
    clock = enterStep(clock, T0 + 4 * MINUTE);
    expect(stepTime(clock, 8, T0 + 6 * MINUTE)).toEqual({ remaining: 6 * MINUTE, over: false });
    expect(stepTime(clock, 8, T0 + 13 * MINUTE)).toEqual({ remaining: -MINUTE, over: true });
  });

  it('compares the lesson with the plan', () => {
    const steps = [4, 4, 8, 7, 8, 4];
    // In step 2 (planned 4:00 to 8:00).
    expect(pace(steps, 1, 5 * MINUTE)).toEqual({ state: 'on-time' });
    expect(pace(steps, 1, 8.5 * MINUTE)).toEqual({ state: 'on-time' });
    expect(pace(steps, 1, 11 * MINUTE)).toEqual({ state: 'behind', minutes: 3 });
    expect(pace(steps, 2, 5 * MINUTE)).toEqual({ state: 'ahead', minutes: 3 });
    expect(paceLabel({ state: 'on-time' })).toBe('On time');
    expect(paceLabel({ state: 'behind', minutes: 1 })).toBe('About 1 minute behind');
    expect(paceLabel({ state: 'ahead', minutes: 3 })).toBe('About 3 minutes ahead');
  });

  it('formats clocks for eyes and for screen readers', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(-65_000)).toBe('1:05');
    expect(formatClock(35 * MINUTE)).toBe('35:00');
    expect(spokenClock(65_000)).toBe('1 minute 5 seconds');
    expect(spokenClock(2 * MINUTE)).toBe('2 minutes');
    expect(spokenClock(9_000)).toBe('9 seconds');
  });

  it('rejects a damaged saved clock', () => {
    expect(isTeachClock(startClock(T0))).toBe(true);
    expect(isTeachClock(pauseClock(startClock(T0), T0 + 1))).toBe(true);
    expect(isTeachClock(null)).toBe(false);
    expect(isTeachClock({ startedAt: 'now', pausedAt: null, pausedTotal: 0, stepEnteredAt: 0 })).toBe(false);
    expect(isTeachClock({ startedAt: T0, pausedAt: null, pausedTotal: -1, stepEnteredAt: 0 })).toBe(false);
  });
});

describe('teach view model', () => {
  const vm = toTeachViewModel(lesson, (id) => id.includes('P01'));

  it('offers the three lesson lengths with timings that add up', () => {
    expect(vm.profiles.map((p) => [p.name, p.minutes])).toEqual([
      ['essential', 25],
      ['standard', 35],
      ['extended', 45],
    ]);
    for (const profile of vm.profiles) {
      expect(profile.steps.reduce((sum, step) => sum + step.minutes, 0)).toBe(profile.minutes);
    }
  });

  it('resolves every question, activity and printable reference in the outline', () => {
    for (const name of ['essential', 'standard', 'extended'] as const) {
      const outline = lesson.teacher.delivery_profiles[name].outline;
      const steps = vm.profiles.find((p) => p.name === name)!.steps;
      outline.forEach((source, index) => {
        expect(steps[index].questions).toHaveLength(source.question_refs?.length ?? 0);
        expect(steps[index].activities).toHaveLength(source.activity_refs?.length ?? 0);
        expect(steps[index].resources).toHaveLength(source.resource_refs?.length ?? 0);
      });
    }
    const resources = vm.profiles.flatMap((p) => p.steps.flatMap((s) => s.resources));
    expect(resources.length).toBeGreaterThan(0);
    for (const resource of resources) {
      // The printable's title, not its id, and a lower-case print link when a view exists.
      expect(resource.title).not.toBe(resource.id);
      expect(resource.href).toBe(`/print/resource/${resource.id.toLowerCase()}/`);
    }
  });

  it('leaves the link off when a printable has no print view', () => {
    const bare = toTeachViewModel(lesson, () => false);
    const resources = bare.profiles.flatMap((p) => p.steps.flatMap((s) => s.resources));
    expect(resources.every((resource) => resource.href === undefined)).toBe(true);
  });

  it('carries what the class needs and none of the editorial or preparation data', () => {
    expect(vm.lessonHref).toBe('/teacher/kids/k1-l19/');
    expect(vm.closing.memoryReference).toBe(lesson.teacher.closing.memory_reference);
    expect(vm.safeguarding.doNotAsk).toEqual(lesson.safeguarding.do_not_ask);
    const serialised = JSON.stringify(vm);
    for (const banned of [
      'source_provenance',
      'review_state',
      'review_flags',
      'editor_notes',
      'decision_register_refs',
      'theological_guardrails',
      'passage_context',
    ]) {
      expect(serialised).not.toContain(banned);
    }
    for (const note of lesson.editorial.editor_notes ?? []) {
      expect(serialised).not.toContain(note);
    }
    expect(serialised).not.toContain(lesson.teacher.preparation.passage_context);
  });
});
