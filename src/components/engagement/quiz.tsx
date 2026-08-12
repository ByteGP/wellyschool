// Quiz renderers for the four v1.2 answer shapes. Feedback is local to the
// browser session; nothing is scored or transmitted.
import { useState } from 'react';
import type { PreparedQuizQuestion } from '../../lib/view-models/engagement';
import { displayOrder, Feedback, OrderableList, useFeedback } from './shared';

type QuestionOf<T extends PreparedQuizQuestion['type']> = Extract<PreparedQuizQuestion, { type: T }>;

export function MultipleChoiceQuestion({ question }: { question: QuestionOf<'multiple_choice'> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useFeedback();

  const choose = (option: string) => {
    setSelected(option);
    setFeedback(
      option === question.answerText
        ? { verdict: 'correct', detail: question.explanation }
        : { verdict: 'retry' },
    );
  };

  return (
    <fieldset className="card" style={{ padding: 'var(--space-4)' }}>
      <legend className="outline-label">{question.question}</legend>
      <ul className="option-list">
        {question.options.map((option) => (
          <li key={option}>
            <button type="button" aria-pressed={selected === option} onClick={() => choose(option)}>
              {option}
            </button>
          </li>
        ))}
      </ul>
      <Feedback state={feedback} />
    </fieldset>
  );
}

export function TrueFalseQuestion({ question }: { question: QuestionOf<'true_false'> }) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useFeedback();

  const choose = (value: boolean) => {
    setSelected(value);
    setFeedback(
      value === question.answerBoolean
        ? { verdict: 'correct', detail: question.explanation }
        : { verdict: 'retry' },
    );
  };

  return (
    <fieldset className="card" style={{ padding: 'var(--space-4)' }}>
      <legend className="outline-label">{question.question}</legend>
      <ul className="option-list">
        {[true, false].map((value) => (
          <li key={String(value)}>
            <button type="button" aria-pressed={selected === value} onClick={() => choose(value)}>
              {value ? 'True' : 'False'}
            </button>
          </li>
        ))}
      </ul>
      <Feedback state={feedback} />
    </fieldset>
  );
}

export function SequenceQuestion({ question }: { question: QuestionOf<'sequence'> }) {
  const [items, setItems] = useState(() => displayOrder(question.answerItems));
  const [feedback, setFeedback, clearFeedback] = useFeedback();

  const check = () => {
    const isCorrect = items.every((item, index) => item === question.answerItems[index]);
    setFeedback(
      isCorrect ? { verdict: 'correct', detail: question.explanation } : { verdict: 'retry' },
    );
  };

  return (
    <fieldset className="card" style={{ padding: 'var(--space-4)' }}>
      <legend className="outline-label">{question.question}</legend>
      <OrderableList
        label="Put these in order"
        items={items}
        onChange={(next) => {
          setItems(next);
          clearFeedback();
        }}
      />
      <button type="button" className="button" onClick={check}>
        Check the order
      </button>
      <Feedback state={feedback} />
    </fieldset>
  );
}

export function SelfCheckQuestion({ question }: { question: QuestionOf<'scenario' | 'short_answer'> }) {
  const [showModel, setShowModel] = useState(false);

  // A model answer for self-comparison - deliberately not scored.
  return (
    <fieldset className="card" style={{ padding: 'var(--space-4)' }}>
      <legend className="outline-label">{question.question}</legend>
      <label>
        <span className="choice-hint">Talk about it or jot your thoughts (optional, stays on this device):</span>
        <textarea className="self-check" rows={3} />
      </label>
      <p style={{ marginTop: 'var(--space-3)' }}>
        <button type="button" className="button button--secondary" aria-expanded={showModel} onClick={() => setShowModel((value) => !value)}>
          {showModel ? 'Hide example answer' : 'Compare with an example answer'}
        </button>
      </p>
      <div aria-live="polite">
        {showModel && (
          <div className="feedback">
            <p style={{ marginBottom: 'var(--space-2)' }}>{question.modelAnswer}</p>
            <p style={{ marginBottom: 0 }} className="choice-hint">
              {question.explanation}
            </p>
          </div>
        )}
      </div>
    </fieldset>
  );
}

export function QuizList({ questions }: { questions: PreparedQuizQuestion[] }) {
  return (
    <div>
      {questions.map((question) => {
        switch (question.type) {
          case 'multiple_choice':
            return <MultipleChoiceQuestion key={question.questionId} question={question} />;
          case 'true_false':
            return <TrueFalseQuestion key={question.questionId} question={question} />;
          case 'sequence':
            return <SequenceQuestion key={question.questionId} question={question} />;
          case 'scenario':
          case 'short_answer':
            return <SelfCheckQuestion key={question.questionId} question={question} />;
        }
      })}
    </div>
  );
}
