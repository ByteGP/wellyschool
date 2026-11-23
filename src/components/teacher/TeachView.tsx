// The Teach view: one lesson, one step at a time, for use during class on a
// tablet (or any screen). A step clock and a lesson clock keep the teacher on
// pace; running over is shown, never enforced. The screen is kept awake where
// the device allows it.
//
// Nothing is collected or transmitted. The place in the lesson and the clock
// live in sessionStorage only, so a reload mid-class picks up where it was.
// The chosen lesson length reuses the lesson page's localStorage preference.
import { useCallback, useEffect, useRef, useState } from 'react';
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
  type TeachClock,
} from '../../lib/teach/clock';
import {
  TEACH_PROFILE_NAMES,
  type TeachProfileName,
  type TeachStep,
  type TeachViewModel,
} from '../../lib/view-models/teach';

type Phase = 'ready' | 'teaching' | 'done';

interface SavedState {
  profile: TeachProfileName;
  phase: Phase;
  step: number;
  clock: TeachClock | null;
}

const PROFILE_KEY = 'wellyschool.teacher.profile';
const stateKey = (lessonId: string) => `wellyschool.teach.${lessonId}`;
/** A saved lesson older than this is from another day: start fresh. */
const STALE_AFTER = 4 * 60 * MINUTE;

const isProfileName = (value: unknown): value is TeachProfileName =>
  typeof value === 'string' && (TEACH_PROFILE_NAMES as readonly string[]).includes(value);

function readSavedProfile(): TeachProfileName | null {
  try {
    const stored = window.localStorage.getItem(PROFILE_KEY);
    return isProfileName(stored) ? stored : null;
  } catch {
    return null;
  }
}

function readSavedState(lessonId: string, now: number): SavedState | null {
  try {
    const raw = window.sessionStorage.getItem(stateKey(lessonId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SavedState>;
    if (!isProfileName(value.profile)) return null;
    if (value.phase !== 'teaching' && value.phase !== 'done') return null;
    if (!isTeachClock(value.clock)) return null;
    if (now - value.clock.startedAt > STALE_AFTER) return null;
    if (typeof value.step !== 'number' || !Number.isInteger(value.step) || value.step < 0) {
      return null;
    }
    return { profile: value.profile, phase: value.phase, step: value.step, clock: value.clock };
  } catch {
    return null;
  }
}

const minutesLabel = (minutes: number) => `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;

const isReadStep = (step: TeachStep) => step.label.toLowerCase().startsWith('read');

/** Arrow keys turn the page, unless the teacher is typing or choosing in a control. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

export default function TeachView({ vm }: { vm: TeachViewModel }) {
  const [profileName, setProfileName] = useState<TeachProfileName>('standard');
  const [phase, setPhase] = useState<Phase>('ready');
  const [step, setStep] = useState(0);
  const [clock, setClock] = useState<TeachClock | null>(null);
  const [now, setNow] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [awake, setAwake] = useState<'unknown' | 'on' | 'unsupported'>('unknown');
  const [announcement, setAnnouncement] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const overAnnounced = useRef(-1);

  const profile = vm.profiles.find((p) => p.name === profileName) ?? vm.profiles[0];
  const steps = profile.steps;
  const lastIndex = steps.length - 1;
  const current = steps[Math.min(step, lastIndex)];
  const paused = clock?.pausedAt != null;

  // Restore the length preference and any lesson in progress.
  useEffect(() => {
    const time = Date.now();
    const saved = readSavedState(vm.lessonId, time);
    if (saved) {
      const savedProfile = vm.profiles.find((p) => p.name === saved.profile);
      setProfileName(saved.profile);
      setPhase(saved.phase);
      setStep(Math.min(saved.step, (savedProfile?.steps.length ?? 1) - 1));
      setClock(saved.clock);
    } else {
      const preferred = readSavedProfile();
      if (preferred) setProfileName(preferred);
    }
    setNow(time);
    setAwake('wakeLock' in navigator ? 'unknown' : 'unsupported');
    setHydrated(true);
  }, [vm.lessonId, vm.profiles]);

  // Remember the place in the lesson for this browser tab only.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (phase === 'ready') window.sessionStorage.removeItem(stateKey(vm.lessonId));
      else {
        const state: SavedState = { profile: profileName, phase, step, clock };
        window.sessionStorage.setItem(stateKey(vm.lessonId), JSON.stringify(state));
      }
    } catch {
      // Keeping the place is optional.
    }
  }, [hydrated, phase, profileName, step, clock, vm.lessonId]);

  // Tick once a second while the lesson is running.
  useEffect(() => {
    if (phase !== 'teaching' || paused) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase, paused]);

  // Keep the screen awake while teaching. The lock is released by the browser
  // whenever the page is hidden, so ask again each time it becomes visible.
  useEffect(() => {
    if (phase !== 'teaching' || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
        setAwake('on');
      } catch {
        // Refused (low battery, power saving): the lesson still works.
        setAwake('unsupported');
      }
    };
    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      void sentinel?.release();
    };
  }, [phase]);

  const focusHeading = () => window.requestAnimationFrame(() => headingRef.current?.focus());

  const goTo = useCallback(
    (next: number) => {
      const time = Date.now();
      if (next > lastIndex) {
        setClock((value) => (value ? pauseClock(value, time) : value));
        setPhase('done');
        setAnnouncement('Lesson finished.');
      } else {
        const target = Math.max(0, next);
        setStep(target);
        setClock((value) => (value ? enterStep(value, time) : value));
        const targetStep = steps[target];
        setAnnouncement(
          `Step ${target + 1} of ${steps.length}: ${targetStep.label}, ${minutesLabel(targetStep.minutes)}.`,
        );
      }
      setNow(time);
      focusHeading();
    },
    [lastIndex, steps],
  );

  // Arrow keys turn the page (handy with a keyboard or a presenter remote).
  useEffect(() => {
    if (phase !== 'teaching') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditable(event.target)) return;
      if (event.key === 'ArrowRight') goTo(step + 1);
      else if (event.key === 'ArrowLeft' && step > 0) goTo(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, step, goTo]);

  const elapsed = clock ? lessonElapsed(clock, now) : 0;
  const stepClock = clock && current ? stepTime(clock, current.minutes, now) : null;

  // Say once, politely, when a step's time is up.
  useEffect(() => {
    if (phase !== 'teaching' || !stepClock?.over) return;
    if (overAnnounced.current === step) return;
    overAnnounced.current = step;
    setAnnouncement(`Time for ${current.label} is up. Move on when you are ready.`);
  }, [phase, step, stepClock?.over, current?.label]);

  const chooseProfile = (name: TeachProfileName) => {
    setProfileName(name);
    try {
      window.localStorage.setItem(PROFILE_KEY, name);
    } catch {
      // Remembering the length is optional.
    }
  };

  const start = () => {
    const time = Date.now();
    overAnnounced.current = -1;
    setClock(startClock(time));
    setStep(0);
    setNow(time);
    setPhase('teaching');
    setAnnouncement(
      `Lesson started. Step 1 of ${steps.length}: ${steps[0].label}, ${minutesLabel(steps[0].minutes)}.`,
    );
    focusHeading();
  };

  const togglePause = () => {
    const time = Date.now();
    setNow(time);
    setClock((value) => {
      if (!value) return value;
      return value.pausedAt === null ? pauseClock(value, time) : resumeClock(value, time);
    });
    setAnnouncement(paused ? 'Clock running.' : 'Clock paused.');
  };

  const backToLastStep = () => {
    const time = Date.now();
    setPhase('teaching');
    setStep(lastIndex);
    setClock((value) => (value ? resumeClock(value, time) : value));
    setNow(time);
    focusHeading();
  };

  const startAgain = () => {
    setPhase('ready');
    setStep(0);
    setClock(null);
    setAnnouncement('');
    focusHeading();
  };

  const liveRegion = (
    <p className="visually-hidden" aria-live="polite" data-testid="teach-announcer">
      {announcement}
    </p>
  );

  if (phase === 'ready') {
    return (
      <section className="teach" aria-label={`Teach: ${vm.title}`}>
        {liveRegion}
        <article className="card card--primary teach-ready">
          <p className="eyebrow">
            {vm.segment} · {vm.ageRange} · Lesson {vm.sequence}
          </p>
          <h1 tabIndex={-1} ref={headingRef}>
            {vm.title}
          </h1>
          <p className="lede">
            <strong>{vm.passages}</strong>
          </p>
          <p>
            <strong>Goal:</strong> {vm.goal}
          </p>

          <h2 className="teach-subhead">How long is the class?</h2>
          <div className="segmented" role="group" aria-label="Choose lesson length">
            {vm.profiles.map((option) => (
              <button
                key={option.name}
                type="button"
                className="button"
                aria-pressed={option.name === profile.name}
                onClick={() => chooseProfile(option.name)}
              >
                {option.label} ({option.minutes} min)
              </button>
            ))}
          </div>
          <p className="choice-hint">
            {profile.steps.length} steps. The clock is a guide: nothing stops if you run over.
          </p>

          {vm.materials.length > 0 && (
            <>
              <h2 className="teach-subhead">Have ready</h2>
              <ul>
                {vm.materials.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          {(vm.safeguarding.doNotAsk.length > 0 || vm.safeguarding.escalationRequired) && (
            <aside className="alert" role="note" aria-labelledby="teach-safeguarding">
              <h2 id="teach-safeguarding" className="teach-subhead">
                Safeguarding
              </h2>
              {vm.safeguarding.doNotAsk.length > 0 && (
                <>
                  <p>
                    <strong>Do not ask:</strong>
                  </p>
                  <ul>
                    {vm.safeguarding.doNotAsk.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              {vm.safeguarding.teacherResponse && (
                <p>
                  <strong>If something comes up:</strong> {vm.safeguarding.teacherResponse}
                </p>
              )}
              {vm.safeguarding.escalationRequired && (
                <p>
                  <strong>Escalation is required for this lesson.</strong>{' '}
                  {vm.safeguarding.escalationNote ?? 'Follow the church safeguarding policy.'}
                </p>
              )}
            </aside>
          )}

          <div className="teach-start">
            <button type="button" className="button teach-button" onClick={start}>
              Start the lesson
            </button>
            <a className="button button--quiet" href={vm.lessonHref}>
              Back to the lesson page
            </a>
          </div>
          {hydrated && (
            <p className="choice-hint">
              {awake === 'unsupported'
                ? 'This device may dim the screen during class. Tap the screen now and then to keep it on.'
                : 'The screen stays on while you teach.'}
            </p>
          )}
        </article>
      </section>
    );
  }

  if (phase === 'done') {
    const taughtMinutes = Math.max(1, Math.round(elapsed / MINUTE));
    return (
      <section className="teach" aria-label={`Teach: ${vm.title}`}>
        {liveRegion}
        <article className="card card--primary teach-ready">
          <p className="eyebrow">
            {vm.title} · {profile.label}
          </p>
          <h1 tabIndex={-1} ref={headingRef}>
            Lesson finished
          </h1>
          <p>You taught for about {minutesLabel(taughtMinutes)}.</p>
          <dl className="kv">
            <dt>Memory verse</dt>
            <dd>{vm.closing.memoryReference}</dd>
            <dt>Take-home line</dt>
            <dd>{vm.closing.takeHomeLine}</dd>
          </dl>
          <p className="choice-hint">
            Record what was taught in the teaching log on the {vm.segment} class page.
          </p>
          <div className="teach-start">
            <a className="button teach-button" href={`/teacher/${vm.segmentSlug}/`}>
              Go to the {vm.segment} class page
            </a>
            <button type="button" className="button button--secondary" onClick={backToLastStep}>
              Back to the last step
            </button>
            <button type="button" className="button button--quiet" onClick={startAgain}>
              Start again
            </button>
          </div>
        </article>
      </section>
    );
  }

  const lessonRemaining = profile.minutes * MINUTE - elapsed;
  const lessonOver = lessonRemaining < 0;
  const currentPace = pace(
    steps.map((s) => s.minutes),
    step,
    elapsed,
  );
  const stepRemaining = stepClock?.remaining ?? current.minutes * MINUTE;
  const stepOver = stepClock?.over ?? false;

  return (
    <section className="teach teach--running" aria-label={`Teach: ${vm.title}`}>
      {liveRegion}
      <div className="teach-layout">
        <nav className="teach-rail" aria-label="Lesson steps">
          <p className="teach-rail__title">{vm.title}</p>
          <ol>
            {steps.map((item, index) => (
              <li key={item.stepId} className={index < step ? 'is-done' : undefined}>
                <button
                  type="button"
                  aria-current={index === step ? 'step' : undefined}
                  onClick={() => goTo(index)}
                >
                  <span className="teach-rail__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="teach-rail__label">
                    <span className="visually-hidden">Step {index + 1}: </span>
                    {item.label}
                  </span>
                  <span className="teach-rail__minutes">{item.minutes} min</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="teach-stage">
          <div className="teach-clocks">
            <p
              className={`teach-clock${stepOver ? ' is-over' : ''}`}
              role="timer"
              aria-live="off"
              aria-label={
                stepOver
                  ? `This step is ${spokenClock(stepRemaining)} over`
                  : `${spokenClock(stepRemaining)} left in this step`
              }
            >
              <span className="teach-clock__time">{formatClock(stepRemaining)}</span>
              <span className="teach-clock__label">
                {stepOver ? 'over on this step' : 'left in this step'}
              </span>
            </p>
            <p
              className="teach-clock teach-clock--lesson"
              role="timer"
              aria-live="off"
              aria-label={
                lessonOver
                  ? `The lesson is ${spokenClock(lessonRemaining)} over. ${paceLabel(currentPace)}`
                  : `${spokenClock(lessonRemaining)} left in the lesson. ${paceLabel(currentPace)}`
              }
            >
              <span className="teach-clock__time">{formatClock(lessonRemaining)}</span>
              <span className="teach-clock__label">
                {lessonOver ? 'over on the lesson' : 'left in the lesson'}
              </span>
              <span className={`teach-pace teach-pace--${currentPace.state}`}>
                {paused ? 'Paused' : paceLabel(currentPace)}
              </span>
            </p>
            <button
              type="button"
              className="button button--secondary teach-pause"
              aria-pressed={paused}
              onClick={togglePause}
            >
              {paused ? 'Resume the clock' : 'Pause the clock'}
            </button>
          </div>

          <article className="card card--primary teach-step">
            <p className="eyebrow">
              Step {step + 1} of {steps.length} · {minutesLabel(current.minutes)}
            </p>
            <h1 tabIndex={-1} ref={headingRef}>
              {current.label}
            </h1>
            <p className="teach-instructions">{current.instructions}</p>

            {step === 0 && vm.opening && (
              <div className="notice">
                <p>
                  <strong>Opening:</strong> {vm.opening}
                </p>
              </div>
            )}

            {isReadStep(current) && (
              <div className="teach-block">
                <h2 className="teach-subhead">Read</h2>
                <p className="teach-passage">{vm.read}</p>
                {vm.say.length > 0 && (
                  <>
                    <h2 className="teach-subhead">In simple words</h2>
                    <ul className="teach-list">
                      {vm.say.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {current.questions.length > 0 && (
              <div className="teach-block">
                <h2 className="teach-subhead">Ask</h2>
                <ol className="teach-list teach-questions">
                  {current.questions.map((question) => (
                    <li key={question.question}>
                      <span className="teach-question">{question.question}</span>
                      {question.simple && (
                        <span className="choice-hint">Simple answer: {question.simple}</span>
                      )}
                      {question.deeper && (
                        <span className="choice-hint">Going deeper: {question.deeper}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {current.activities.map((activity) => (
              <div className="teach-block" key={activity.title}>
                <h2 className="teach-subhead">
                  {activity.title} · {activity.minutes} min
                </h2>
                {activity.materials.length > 0 && (
                  <p>
                    <strong>Materials:</strong> {activity.materials.join('; ')}
                  </p>
                )}
                <ol className="teach-list">
                  {activity.steps.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
                {activity.lowResource && (
                  <p className="choice-hint">Without materials: {activity.lowResource}</p>
                )}
              </div>
            ))}

            {current.resources.length > 0 && (
              <p className="teach-resources">
                <strong>Printable:</strong>{' '}
                {current.resources.map((resource, index) => (
                  <span key={resource.id}>
                    {index > 0 && ' · '}
                    {resource.href ? (
                      <a href={resource.href} target="_blank" rel="noopener">
                        {resource.title}
                        <span className="visually-hidden"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      resource.title
                    )}
                  </span>
                ))}
              </p>
            )}

            {step === lastIndex && (
              <div className="teach-block">
                <h2 className="teach-subhead">Close the class</h2>
                <dl className="kv">
                  <dt>Take-home line</dt>
                  <dd>{vm.closing.takeHomeLine}</dd>
                  <dt>Memory verse</dt>
                  <dd>{vm.closing.memoryReference}</dd>
                  <dt>Prayer</dt>
                  <dd>{vm.closing.prayerPrompt}</dd>
                </dl>
              </div>
            )}
          </article>
        </div>
      </div>

      <div className="teach-nav">
        <button
          type="button"
          className="button button--secondary teach-button"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
        >
          Back
        </button>
        <button
          type="button"
          className="button teach-button teach-button--next"
          onClick={() => goTo(step + 1)}
        >
          {step === lastIndex ? 'Finish' : `Next: ${steps[step + 1].label}`}
        </button>
      </div>
    </section>
  );
}
