// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  MultipleChoiceQuestion,
  QuizList,
  SelfCheckQuestion,
  SequenceQuestion,
  TrueFalseQuestion,
} from '../../src/components/engagement/quiz';

describe('MultipleChoiceQuestion', () => {
  const question = {
    type: 'multiple_choice',
    questionId: 'Q1',
    question: 'Where were they?',
    options: ['In a boat', 'In a field'],
    answerText: 'In a boat',
    explanation: 'They were crossing the lake.',
  } as const;

  it('confirms a correct choice with the explanation', async () => {
    const user = userEvent.setup();
    render(<MultipleChoiceQuestion question={question} />);
    await user.click(screen.getByRole('button', { name: 'In a boat' }));
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
    expect(screen.getByText(/crossing the lake/)).toBeInTheDocument();
  });

  it('invites another try on a wrong choice without revealing the answer', async () => {
    const user = userEvent.setup();
    render(<MultipleChoiceQuestion question={question} />);
    await user.click(screen.getByRole('button', { name: 'In a field' }));
    expect(screen.getByText(/Not yet/)).toBeInTheDocument();
    expect(screen.queryByText(/crossing the lake/)).not.toBeInTheDocument();
  });
});

describe('TrueFalseQuestion', () => {
  const question = {
    type: 'true_false',
    questionId: 'Q2',
    question: 'True or false: it promises a trouble-free life.',
    answerBoolean: false,
    explanation: 'It shows authority and presence.',
  } as const;

  it('marks the correct boolean', async () => {
    const user = userEvent.setup();
    render(<TrueFalseQuestion question={question} />);
    await user.click(screen.getByRole('button', { name: 'False' }));
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });

  it('marks the wrong boolean as retry', async () => {
    const user = userEvent.setup();
    render(<TrueFalseQuestion question={question} />);
    await user.click(screen.getByRole('button', { name: 'True' }));
    expect(screen.getByText(/Not yet/)).toBeInTheDocument();
  });
});

describe('SequenceQuestion', () => {
  const question = {
    type: 'sequence',
    questionId: 'Q3',
    question: 'Put the events in order.',
    answerItems: ['Crossing', 'Storm', 'Calm'],
    explanation: 'Narrative order.',
  } as const;

  it('starts out of order and can be corrected with buttons only', async () => {
    const user = userEvent.setup();
    render(<SequenceQuestion question={question} />);
    // Initial display order is rotated: Storm, Calm, Crossing.
    await user.click(screen.getByRole('button', { name: 'Check the order' }));
    expect(screen.getByText(/Not yet/)).toBeInTheDocument();

    // Move "Crossing" to the top with its Up button (no dragging).
    await user.click(screen.getByRole('button', { name: 'Move "Crossing" earlier' }));
    await user.click(screen.getByRole('button', { name: 'Move "Crossing" earlier' }));
    await user.click(screen.getByRole('button', { name: 'Check the order' }));
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });
});

describe('SelfCheckQuestion', () => {
  const question = {
    type: 'scenario',
    questionId: 'Q4',
    question: 'What would you say to a friend?',
    modelAnswer: 'Listen first, then point to hope.',
    explanation: 'Model answers are for comparing, not marking.',
  } as const;

  it('shows a model answer for self-check without any scoring', async () => {
    const user = userEvent.setup();
    render(<SelfCheckQuestion question={question} />);
    expect(screen.queryByText(/Listen first/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Compare with an example answer/ }));
    expect(screen.getByText(/Listen first/)).toBeInTheDocument();
    expect(screen.queryByText(/Correct/)).not.toBeInTheDocument();
  });
});

describe('QuizList', () => {
  it('renders every question type through the kind-driven switch', () => {
    render(
      <QuizList
        questions={[
          {
            type: 'multiple_choice',
            questionId: 'Q1',
            question: 'MC?',
            options: ['A', 'B'],
            answerText: 'A',
            explanation: '',
          },
          { type: 'true_false', questionId: 'Q2', question: 'TF?', answerBoolean: true, explanation: '' },
          {
            type: 'sequence',
            questionId: 'Q3',
            question: 'Seq?',
            answerItems: ['1', '2'],
            explanation: '',
          },
          {
            type: 'short_answer',
            questionId: 'Q4',
            question: 'Short?',
            modelAnswer: 'Answer',
            explanation: '',
          },
        ]}
      />,
    );
    expect(screen.getByText('MC?')).toBeInTheDocument();
    expect(screen.getByText('TF?')).toBeInTheDocument();
    expect(screen.getByText('Seq?')).toBeInTheDocument();
    expect(screen.getByText('Short?')).toBeInTheDocument();
  });
});
