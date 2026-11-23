// Pure timing helpers for the Teach view. No I/O and no Date.now() here, so the
// rules are unit-testable; the island passes the current time in.
//
// The clocks are guides for the teacher, never limits: running over is shown,
// nothing is ever stopped or skipped because of it.

export interface TeachClock {
  /** Wall-clock time the lesson was started (ms since epoch). */
  startedAt: number;
  /** Set while paused: the wall-clock time the pause began. */
  pausedAt: number | null;
  /** Total time spent paused before the current pause (ms). */
  pausedTotal: number;
  /** Lesson-elapsed time (ms) at the moment the current step was opened. */
  stepEnteredAt: number;
}

export const MINUTE = 60_000;

export function startClock(now: number): TeachClock {
  return { startedAt: now, pausedAt: null, pausedTotal: 0, stepEnteredAt: 0 };
}

/** Time spent teaching so far, excluding pauses. Never negative. */
export function lessonElapsed(clock: TeachClock, now: number): number {
  const end = clock.pausedAt ?? now;
  return Math.max(0, end - clock.startedAt - clock.pausedTotal);
}

export function pauseClock(clock: TeachClock, now: number): TeachClock {
  return clock.pausedAt === null ? { ...clock, pausedAt: now } : clock;
}

export function resumeClock(clock: TeachClock, now: number): TeachClock {
  if (clock.pausedAt === null) return clock;
  return {
    ...clock,
    pausedAt: null,
    pausedTotal: clock.pausedTotal + Math.max(0, now - clock.pausedAt),
  };
}

/** Mark the moment a step is opened, so its own clock starts from zero. */
export function enterStep(clock: TeachClock, now: number): TeachClock {
  return { ...clock, stepEnteredAt: lessonElapsed(clock, now) };
}

export interface StepTime {
  /** Time left in the step; negative once the step has run over. */
  remaining: number;
  over: boolean;
}

export function stepTime(clock: TeachClock, stepMinutes: number, now: number): StepTime {
  const spent = lessonElapsed(clock, now) - clock.stepEnteredAt;
  const remaining = stepMinutes * MINUTE - spent;
  return { remaining, over: remaining < 0 };
}

export type Pace =
  | { state: 'on-time' }
  | { state: 'behind'; minutes: number }
  | { state: 'ahead'; minutes: number };

/**
 * Compare where the lesson is with where the plan says it should be.
 * Behind: the planned end of the current step has already passed.
 * Ahead: the current step was reached before its planned start.
 * Differences under a minute count as on time.
 */
export function pace(stepMinutes: readonly number[], index: number, elapsed: number): Pace {
  const plannedStart = stepMinutes.slice(0, index).reduce((sum, m) => sum + m, 0) * MINUTE;
  const plannedEnd = plannedStart + (stepMinutes[index] ?? 0) * MINUTE;
  if (elapsed > plannedEnd) {
    const minutes = Math.floor((elapsed - plannedEnd) / MINUTE);
    return minutes >= 1 ? { state: 'behind', minutes } : { state: 'on-time' };
  }
  if (elapsed < plannedStart) {
    const minutes = Math.floor((plannedStart - elapsed) / MINUTE);
    return minutes >= 1 ? { state: 'ahead', minutes } : { state: 'on-time' };
  }
  return { state: 'on-time' };
}

export function paceLabel(value: Pace): string {
  if (value.state === 'on-time') return 'On time';
  const unit = value.minutes === 1 ? 'minute' : 'minutes';
  return value.state === 'behind'
    ? `About ${value.minutes} ${unit} behind`
    : `About ${value.minutes} ${unit} ahead`;
}

/** m:ss for a duration; the sign is dropped (callers say "left" or "over"). */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Spoken form for screen readers: "3 minutes 5 seconds". */
export function spokenClock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const m = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const s = `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  if (minutes === 0) return s;
  return seconds === 0 ? m : `${m} ${s}`;
}

/** Validate a clock restored from storage; anything odd means start fresh. */
export function isTeachClock(value: unknown): value is TeachClock {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  return (
    num(c.startedAt) &&
    num(c.pausedTotal) &&
    num(c.stepEnteredAt) &&
    (c.pausedAt === null || num(c.pausedAt))
  );
}
