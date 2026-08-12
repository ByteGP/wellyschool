// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PuzzleRenderer } from '../../src/components/engagement/puzzles';

describe('SequencePuzzle', () => {
  it('checks order corrected with buttons', async () => {
    const user = userEvent.setup();
    render(
      <PuzzleRenderer
        puzzle={{
          type: 'sequence',
          title: 'Order it',
          instructions: 'Arrange the cards.',
          items: ['Storm', 'Cross', 'Calm'],
          solutionItems: ['Cross', 'Storm', 'Calm'],
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Check the order' }));
    expect(screen.getByText(/Not yet/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Move "Cross" earlier' }));
    await user.click(screen.getByRole('button', { name: 'Check the order' }));
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });
});

describe('MatchingPuzzle', () => {
  it('matches prompts to choices with selects (no dragging)', async () => {
    const user = userEvent.setup();
    render(
      <PuzzleRenderer
        puzzle={{
          type: 'matching',
          title: 'Match',
          instructions: 'Match each symbol.',
          pairs: [
            { prompt: 'Bread', answer: 'Body' },
            { prompt: 'Cup', answer: 'Blood' },
          ],
          choices: ['Body', 'Blood'],
        }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Check answers' }));
    expect(screen.getByText(/Answer every row first/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Bread'), 'Body');
    await user.selectOptions(screen.getByLabelText('Cup'), 'Blood');
    await user.click(screen.getByRole('button', { name: 'Check answers' }));
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });
});

describe('SortPuzzle', () => {
  it('sorts items into labelled groups', async () => {
    const user = userEvent.setup();
    render(
      <PuzzleRenderer
        puzzle={{
          type: 'sort',
          title: 'Sort',
          instructions: 'Sort the responses.',
          groups: [
            { label: 'Helpful', items: ['Listen well'] },
            { label: 'Unhelpful', items: ['Blame them'] },
          ],
          items: ['Listen well', 'Blame them'],
        }}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Listen well'), 'Helpful');
    await user.selectOptions(screen.getByLabelText('Blame them'), 'Helpful');
    await user.click(screen.getByRole('button', { name: 'Check the groups' }));
    expect(screen.getByText(/Not yet/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Blame them'), 'Unhelpful');
    await user.click(screen.getByRole('button', { name: 'Check the groups' }));
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });
});

describe('CaseGridPuzzle', () => {
  it('judges each case against the labelled choices', async () => {
    const user = userEvent.setup();
    render(
      <PuzzleRenderer
        puzzle={{
          type: 'case_grid',
          title: 'Cases',
          instructions: 'Assess each case.',
          pairs: [{ prompt: 'A friend shares a rumour', answer: 'Pause and check' }],
          choices: ['Pause and check', 'Share it on'],
        }}
      />,
    );
    await user.selectOptions(screen.getByLabelText('A friend shares a rumour'), 'Pause and check');
    await user.click(screen.getByRole('button', { name: 'Check answers' }));
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });
});

describe('WordScramblePuzzle', () => {
  it('accepts the solution case-insensitively', async () => {
    const user = userEvent.setup();
    render(
      <PuzzleRenderer
        puzzle={{
          type: 'word_scramble',
          title: 'Unscramble',
          instructions: 'Find the word.',
          items: ['TSURT'],
          solutionText: 'TRUST',
        }}
      />,
    );
    await user.type(screen.getByLabelText('Your answer'), 'trust');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });
});
