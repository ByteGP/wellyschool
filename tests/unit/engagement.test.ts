import { describe, expect, it } from 'vitest';
import type { Engagement, QuizQuestion } from '../../src/types';
import { preparePuzzle, prepareQuizQuestion } from '../../src/lib/view-models/engagement';

type Puzzle = Engagement['puzzle'];

describe('prepareQuizQuestion', () => {
  it('prepares multiple choice with a validated correct option', () => {
    const prepared = prepareQuizQuestion({
      question_id: 'Q1',
      question: 'Where were they?',
      type: 'multiple_choice',
      options: ['In a boat', 'In a field'],
      answer: { kind: 'text', text: 'In a boat' },
      explanation: 'Crossing the lake.',
    });
    expect(prepared).toMatchObject({ type: 'multiple_choice', answerText: 'In a boat' });
  });

  it('prepares true/false questions', () => {
    const prepared = prepareQuizQuestion({
      question_id: 'Q2',
      question: 'True or false?',
      type: 'true_false',
      answer: { kind: 'boolean', boolean: false },
      explanation: 'No.',
    });
    expect(prepared).toMatchObject({ type: 'true_false', answerBoolean: false });
  });

  it('prepares sequence questions', () => {
    const prepared = prepareQuizQuestion({
      question_id: 'Q3',
      question: 'Order the events.',
      type: 'sequence',
      answer: { kind: 'ordered_list', items: ['First', 'Second'] },
      explanation: 'Narrative order.',
    });
    expect(prepared).toMatchObject({ type: 'sequence', answerItems: ['First', 'Second'] });
  });

  it('prepares scenario and short_answer with a model answer for self-check', () => {
    for (const type of ['scenario', 'short_answer'] as const) {
      const prepared = prepareQuizQuestion({
        question_id: 'Q4',
        question: 'What would you do?',
        type,
        answer: { kind: 'text', text: 'A considered response.' },
        explanation: 'Self-check only.',
      });
      expect(prepared).toMatchObject({ type, modelAnswer: 'A considered response.' });
    }
  });

  it('rejects mismatched answer kinds', () => {
    const bad: QuizQuestion = {
      question_id: 'QX',
      question: 'Broken',
      type: 'true_false',
      answer: { kind: 'text', text: 'yes' },
      explanation: '',
    };
    expect(() => prepareQuizQuestion(bad)).toThrow(/boolean/);
  });

  it('rejects a multiple-choice answer that is not an option', () => {
    expect(() =>
      prepareQuizQuestion({
        question_id: 'QX',
        question: 'Broken',
        type: 'multiple_choice',
        options: ['A', 'B'],
        answer: { kind: 'text', text: 'C' },
        explanation: '',
      }),
    ).toThrow(/not among the options/);
  });
});

describe('preparePuzzle', () => {
  it('prepares sequence puzzles with shuffled display items', () => {
    const prepared = preparePuzzle({
      type: 'sequence',
      title: 'Order it',
      instructions: 'Arrange.',
      items: ['B', 'A'],
      solution: { kind: 'ordered_list', items: ['A', 'B'] },
    });
    expect(prepared).toMatchObject({ type: 'sequence', items: ['B', 'A'], solutionItems: ['A', 'B'] });
  });

  it('prepares matching puzzles and requires choices to cover answers', () => {
    const prepared = preparePuzzle({
      type: 'matching',
      title: 'Match',
      instructions: 'Match each.',
      solution: { kind: 'pairs', pairs: [{ prompt: 'Bread', answer: 'Body' }] },
      choices: ['Body', 'Blood'],
    });
    expect(prepared).toMatchObject({ type: 'matching', choices: ['Body', 'Blood'] });
  });

  it('prepares sort puzzles and derives the item pool from groups', () => {
    const prepared = preparePuzzle({
      type: 'sort',
      title: 'Sort',
      instructions: 'Sort into groups.',
      solution: {
        kind: 'groups',
        groups: [
          { label: 'Helpful', items: ['Listen'] },
          { label: 'Unhelpful', items: ['Blame'] },
        ],
      },
    });
    expect(prepared).toMatchObject({ type: 'sort', items: ['Listen', 'Blame'] });
  });

  it('prepares case_grid puzzles from pairs', () => {
    const prepared = preparePuzzle({
      type: 'case_grid',
      title: 'Cases',
      instructions: 'Judge each case.',
      solution: { kind: 'pairs', pairs: [{ prompt: 'Case 1', answer: 'Wise' }] },
      choices: ['Wise', 'Unwise'],
    });
    expect(prepared).toMatchObject({ type: 'case_grid' });
  });

  it('prepares word_scramble puzzles', () => {
    const prepared = preparePuzzle({
      type: 'word_scramble',
      title: 'Unscramble',
      instructions: 'Find the word.',
      items: ['TSURT'],
      solution: { kind: 'text', text: 'TRUST' },
    });
    expect(prepared).toMatchObject({ type: 'word_scramble', solutionText: 'TRUST' });
  });

  it('rejects mismatched solution kinds', () => {
    const bad: Puzzle = {
      type: 'sequence',
      title: 'Broken',
      instructions: '',
      solution: { kind: 'pairs', pairs: [{ prompt: 'a', answer: 'b' }] },
    };
    expect(() => preparePuzzle(bad)).toThrow(/ordered_list/);
  });
});
