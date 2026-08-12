// Puzzle renderers for the five v1.2 solution shapes. No drag-only
// interactions: ordering uses buttons, matching and sorting use selects.
import { useId, useState } from 'react';
import type { PreparedPuzzle } from '../../lib/view-models/engagement';
import { displayOrder, Feedback, OrderableList, useFeedback } from './shared';

type PuzzleOf<T extends PreparedPuzzle['type']> = Extract<PreparedPuzzle, { type: T }>;

export function SequencePuzzle({ puzzle }: { puzzle: PuzzleOf<'sequence'> }) {
  const startItems =
    JSON.stringify(puzzle.items) === JSON.stringify(puzzle.solutionItems)
      ? displayOrder(puzzle.solutionItems)
      : puzzle.items;
  const [items, setItems] = useState(startItems);
  const [feedback, setFeedback, clearFeedback] = useFeedback();

  const check = () => {
    const isCorrect = items.every((item, index) => item === puzzle.solutionItems[index]);
    setFeedback(isCorrect ? { verdict: 'correct' } : { verdict: 'retry' });
  };

  return (
    <div>
      <p>{puzzle.instructions}</p>
      <OrderableList
        label="Arrange in order"
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
    </div>
  );
}

/** Matching and case-grid puzzles share a prompt → choice select mechanic. */
function PairsPuzzle({
  puzzle,
}: {
  puzzle: PuzzleOf<'matching'> | PuzzleOf<'case_grid'>;
}) {
  const baseId = useId();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback, clearFeedback] = useFeedback();

  const check = () => {
    const allChosen = puzzle.pairs.every((pair) => answers[pair.prompt]);
    if (!allChosen) {
      setFeedback({ verdict: 'retry', detail: 'Answer every row first.' });
      return;
    }
    const isCorrect = puzzle.pairs.every((pair) => answers[pair.prompt] === pair.answer);
    setFeedback(isCorrect ? { verdict: 'correct' } : { verdict: 'retry' });
  };

  return (
    <div>
      <p>{puzzle.instructions}</p>
      {puzzle.pairs.map((pair, index) => {
        const selectId = `${baseId}-pair-${index}`;
        return (
          <div key={pair.prompt} className="match-row">
            <label htmlFor={selectId}>{pair.prompt}</label>
            <select
              id={selectId}
              value={answers[pair.prompt] ?? ''}
              onChange={(event) => {
                setAnswers((current) => ({ ...current, [pair.prompt]: event.target.value }));
                clearFeedback();
              }}
            >
              <option value="">Choose</option>
              {puzzle.choices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      <p style={{ marginTop: 'var(--space-3)' }}>
        <button type="button" className="button" onClick={check}>
          Check answers
        </button>
      </p>
      <Feedback state={feedback} />
    </div>
  );
}

export function MatchingPuzzle({ puzzle }: { puzzle: PuzzleOf<'matching'> }) {
  return <PairsPuzzle puzzle={puzzle} />;
}

export function CaseGridPuzzle({ puzzle }: { puzzle: PuzzleOf<'case_grid'> }) {
  return <PairsPuzzle puzzle={puzzle} />;
}

export function SortPuzzle({ puzzle }: { puzzle: PuzzleOf<'sort'> }) {
  const baseId = useId();
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [feedback, setFeedback, clearFeedback] = useFeedback();
  const groupOf = new Map(
    puzzle.groups.flatMap((group) => group.items.map((item) => [item, group.label] as const)),
  );

  const check = () => {
    const allPlaced = puzzle.items.every((item) => placements[item]);
    if (!allPlaced) {
      setFeedback({ verdict: 'retry', detail: 'Sort every item first.' });
      return;
    }
    const isCorrect = puzzle.items.every((item) => placements[item] === groupOf.get(item));
    setFeedback(isCorrect ? { verdict: 'correct' } : { verdict: 'retry' });
  };

  return (
    <div>
      <p>{puzzle.instructions}</p>
      {puzzle.items.map((item, index) => {
        const selectId = `${baseId}-sort-${index}`;
        return (
          <div key={item} className="match-row">
            <label htmlFor={selectId}>{item}</label>
            <select
              id={selectId}
              value={placements[item] ?? ''}
              onChange={(event) => {
                setPlacements((current) => ({ ...current, [item]: event.target.value }));
                clearFeedback();
              }}
            >
              <option value="">Choose a group</option>
              {puzzle.groups.map((group) => (
                <option key={group.label} value={group.label}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      <p style={{ marginTop: 'var(--space-3)' }}>
        <button type="button" className="button" onClick={check}>
          Check the groups
        </button>
      </p>
      <Feedback state={feedback} />
    </div>
  );
}

export function WordScramblePuzzle({ puzzle }: { puzzle: PuzzleOf<'word_scramble'> }) {
  const inputId = useId();
  const [attempt, setAttempt] = useState('');
  const [feedback, setFeedback, clearFeedback] = useFeedback();

  const check = () => {
    const isCorrect = attempt.trim().toLowerCase() === puzzle.solutionText.trim().toLowerCase();
    setFeedback(isCorrect ? { verdict: 'correct' } : { verdict: 'retry' });
  };

  return (
    <div>
      <p>{puzzle.instructions}</p>
      {puzzle.items.length > 0 && (
        <p style={{ fontSize: 'var(--text-xl)', letterSpacing: '0.15em', fontWeight: 700 }}>
          {puzzle.items.join(' · ')}
        </p>
      )}
      <div className="match-row">
        <label htmlFor={inputId}>Your answer</label>
        <input
          id={inputId}
          type="text"
          className="self-check"
          style={{ minHeight: 'var(--tap-target)' }}
          value={attempt}
          onChange={(event) => {
            setAttempt(event.target.value);
            clearFeedback();
          }}
        />
      </div>
      <p style={{ marginTop: 'var(--space-3)' }}>
        <button type="button" className="button" onClick={check}>
          Check
        </button>
      </p>
      <Feedback state={feedback} />
    </div>
  );
}

export function PuzzleRenderer({ puzzle }: { puzzle: PreparedPuzzle }) {
  switch (puzzle.type) {
    case 'sequence':
      return <SequencePuzzle puzzle={puzzle} />;
    case 'matching':
      return <MatchingPuzzle puzzle={puzzle} />;
    case 'sort':
      return <SortPuzzle puzzle={puzzle} />;
    case 'case_grid':
      return <CaseGridPuzzle puzzle={puzzle} />;
    case 'word_scramble':
      return <WordScramblePuzzle puzzle={puzzle} />;
  }
}
