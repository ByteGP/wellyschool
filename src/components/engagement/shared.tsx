// Shared engagement primitives. All feedback stays in the browser: nothing is
// scored, stored, or transmitted. No points, streaks, or badges.
import { useId, useState } from 'react';

export interface FeedbackState {
  verdict: 'correct' | 'retry' | null;
  detail?: string;
}

/** Quiz/puzzle feedback with a polite live region for screen readers. */
export function Feedback({ state }: { state: FeedbackState }) {
  return (
    <div aria-live="polite">
      {state.verdict !== null && (
        <p
          className={`feedback ${state.verdict === 'correct' ? 'feedback--correct' : 'feedback--retry'}`}
        >
          <span className="feedback-verdict">
            {state.verdict === 'correct' ? 'Correct. ' : 'Not yet — have another look. '}
          </span>
          {state.detail}
        </p>
      )}
    </div>
  );
}

interface OrderableListProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}

/**
 * Reorderable list without drag: every item moves with Up/Down buttons
 * (WCAG 2.2 — no drag-only interaction).
 */
export function OrderableList({ label, items, onChange }: OrderableListProps) {
  const baseId = useId();

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <ol className="option-list" aria-label={label}>
      {items.map((item, index) => (
        <li key={item} className="sequence-item">
          <span className="sequence-text" id={`${baseId}-item-${index}`}>
            <span aria-hidden="true">{index + 1}. </span>
            {item}
          </span>
          <button
            type="button"
            onClick={() => move(index, -1)}
            disabled={index === 0}
            aria-label={`Move "${item}" earlier`}
          >
            <span aria-hidden="true">↑</span>
          </button>
          <button
            type="button"
            onClick={() => move(index, 1)}
            disabled={index === items.length - 1}
            aria-label={`Move "${item}" later`}
          >
            <span aria-hidden="true">↓</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Deterministic "shuffle" that guarantees a different order from the solution. */
export function displayOrder(solution: string[]): string[] {
  if (solution.length < 2) return [...solution];
  const rotated = [...solution.slice(1), solution[0]];
  return rotated;
}

/** Small helper hook for check-answer widgets. */
export function useFeedback(): [FeedbackState, (state: FeedbackState) => void, () => void] {
  const [state, setState] = useState<FeedbackState>({ verdict: null });
  return [state, setState, () => setState({ verdict: null })];
}
