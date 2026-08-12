// The guided 15-minute Family flow: Connect, Read, Understand, Play, Respond,
// one step at a time, then a completion view with the weekly action, prayer,
// and parent note.
//
// Progress is optional and stays in sessionStorage only. Restart clears only
// this lesson's progress. Nothing is collected or transmitted; there are no
// points, streaks, scores, or badges.
import { useEffect, useRef, useState } from 'react';
import type { FamilyViewModel } from '../../lib/view-models/family';
import { QuizList } from '../engagement/quiz';
import { PuzzleRenderer } from '../engagement/puzzles';

const STEP_NAMES: Record<string, string> = {
  connect: 'Connect',
  read: 'Read',
  understand: 'Understand',
  play: 'Play',
  respond: 'Respond',
};

const storageKey = (lessonId: string) => `wellyschool.family.${lessonId}`;

function readSavedStep(lessonId: string, maxStep: number): number {
  try {
    const raw = window.sessionStorage.getItem(storageKey(lessonId));
    const value = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isInteger(value) && value >= 0 && value <= maxStep ? value : 0;
  } catch {
    return 0;
  }
}

export default function FamilyStepper({ vm }: { vm: FamilyViewModel }) {
  // Steps 0..4 are the flow; step 5 is the completion view.
  const doneIndex = vm.flow.length;
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setStep(readSavedStep(vm.lessonId, doneIndex));
    setHydrated(true);
  }, [vm.lessonId, doneIndex]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(storageKey(vm.lessonId), String(step));
    } catch {
      // Progress persistence is optional.
    }
  }, [step, hydrated, vm.lessonId]);

  const goTo = (next: number) => {
    setStep(next);
    // Move focus to the step heading so the change is announced.
    window.requestAnimationFrame(() => headingRef.current?.focus());
  };

  const restart = () => {
    try {
      window.sessionStorage.removeItem(storageKey(vm.lessonId));
    } catch {
      // Nothing stored.
    }
    goTo(0);
  };

  const current = step < doneIndex ? vm.flow[step] : undefined;
  const showQuiz = vm.interactive.type === 'quiz';
  const showPuzzle = vm.interactive.type === 'puzzle';

  return (
    <section aria-label={`Family lesson: ${vm.familyTitle}`}>
      <ol className="stepper-progress" aria-label="Lesson steps">
        {vm.flow.map((flowStep, index) => (
          <li
            key={flowStep.type}
            aria-current={index === step ? 'step' : undefined}
            className={index < step ? 'is-done' : undefined}
          >
            {STEP_NAMES[flowStep.type] ?? flowStep.type}
          </li>
        ))}
      </ol>
      <p className="visually-hidden" aria-live="polite">
        {current
          ? `Step ${step + 1} of ${doneIndex}: ${STEP_NAMES[current.type] ?? current.type}`
          : 'Lesson complete'}
      </p>

      {current ? (
        <article className="card card--primary">
          <p className="eyebrow">
            Step {step + 1} of {doneIndex} · about {current.duration_minutes}{' '}
            {current.duration_minutes === 1 ? 'minute' : 'minutes'}
          </p>
          <h2 tabIndex={-1} ref={headingRef}>
            {STEP_NAMES[current.type] ?? current.type}
          </h2>
          <p className="lede">{current.instructions}</p>

          {current.type === 'read' && (
            <p>
              <strong>Passage: {vm.passages.map((passage) => passage.reference).join('; ')}</strong>
              {vm.passages.map((passage) =>
                passage.readingNote ? (
                  <span key={passage.reference}>
                    <br />
                    {passage.readingNote}
                  </span>
                ) : null,
              )}
            </p>
          )}

          {current.type === 'understand' && (
            <ul>
              {vm.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          )}

          {current.type === 'play' && (
            <div>
              <h3>{vm.interactive.title}</h3>
              {showQuiz ? (
                <QuizList questions={vm.quiz} />
              ) : showPuzzle ? (
                <PuzzleRenderer puzzle={vm.puzzle} />
              ) : (
                <p>{vm.interactive.instructions}</p>
              )}
            </div>
          )}

          {current.type === 'respond' && (
            <div className="notice">
              <p style={{ marginBottom: 0 }}>
                <strong>Pray together:</strong> {vm.prayer}
              </p>
            </div>
          )}

          <div className="stepper-nav">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => goTo(step - 1)}
              disabled={step === 0}
            >
              Back
            </button>
            <button type="button" className="button" onClick={() => goTo(step + 1)}>
              {step === doneIndex - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </article>
      ) : (
        <article className="card card--primary">
          <h2 tabIndex={-1} ref={headingRef}>
            Well done! Lesson complete
          </h2>
          <p className="lede">{vm.bigIdea}</p>
          <dl className="kv">
            <dt>This week's action</dt>
            <dd>{vm.weeklyAction}</dd>
            <dt>Prayer</dt>
            <dd>{vm.prayer}</dd>
            <dt>Note for parents</dt>
            <dd>{vm.parentNote}</dd>
          </dl>
          {!showQuiz && (
            <details className="section">
              <summary>Extra: quick quiz</summary>
              <div className="section-body">
                <QuizList questions={vm.quiz} />
              </div>
            </details>
          )}
          {!showPuzzle && (
            <details className="section">
              <summary>Extra: {vm.puzzle.title}</summary>
              <div className="section-body">
                <PuzzleRenderer puzzle={vm.puzzle} />
              </div>
            </details>
          )}
          <div className="stepper-nav">
            <button type="button" className="button button--secondary" onClick={() => goTo(doneIndex - 1)}>
              Back
            </button>
            <button type="button" className="button button--quiet" onClick={restart}>
              Restart this lesson
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
