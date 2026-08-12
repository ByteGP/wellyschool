// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import FamilyStepper from '../../src/components/family/FamilyStepper';
import lessonJson from '../../src/content/lessons/kids/k1-l19_jesus_calms_the_storm.json';
import type { LessonContent } from '../../src/types';
import { toFamilyViewModel } from '../../src/lib/view-models/family';

const vm = toFamilyViewModel(lessonJson as unknown as LessonContent);
const STORAGE_KEY = `wellyschool.family.${vm.lessonId}`;

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('FamilyStepper', () => {
  it('shows one step at a time with visible progress and no scores', () => {
    render(<FamilyStepper vm={vm} />);
    expect(screen.getByRole('heading', { name: 'Connect' })).toBeInTheDocument();
    expect(screen.getAllByText(/Step 1 of 5/).length).toBeGreaterThan(0);
    // No gamification vocabulary anywhere.
    const text = document.body.textContent ?? '';
    for (const banned of ['points', 'streak', 'score', 'badge', 'leaderboard']) {
      expect(text.toLowerCase()).not.toContain(banned);
    }
  });

  it('navigates forward and back through the five steps', async () => {
    const user = userEvent.setup();
    render(<FamilyStepper vm={vm} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Read' })).toBeInTheDocument();
    expect(screen.getAllByText(/Mark 4:35-41/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Connect' })).toBeInTheDocument();
  });

  it('always shows weekly action, prayer, and parent note at completion', async () => {
    const user = userEvent.setup();
    render(<FamilyStepper vm={vm} />);
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByRole('heading', { name: /lesson complete/i })).toBeInTheDocument();
    expect(screen.getByText(vm.weeklyAction)).toBeInTheDocument();
    expect(screen.getAllByText(vm.prayer).length).toBeGreaterThan(0);
    expect(screen.getByText(vm.parentNote)).toBeInTheDocument();
  });

  it('persists progress in sessionStorage only and restart clears only this lesson', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem('wellyschool.family.OTHER', '3');
    render(<FamilyStepper vm={vm} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('1');
    // Nothing in localStorage for family progress.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    for (let i = 0; i < 3; i += 1) await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    await user.click(screen.getByRole('button', { name: 'Restart this lesson' }));
    expect(screen.getByRole('heading', { name: 'Connect' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem('wellyschool.family.OTHER')).toBe('3');
  });

  it('resumes from saved progress', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '2');
    render(<FamilyStepper vm={vm} />);
    expect(screen.getByRole('heading', { name: 'Understand' })).toBeInTheDocument();
  });

  it('offers the quiz and puzzle as extras when the interactive is offline (movement)', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(STORAGE_KEY, '5');
    render(<FamilyStepper vm={vm} />);
    expect(vm.interactive.type).toBe('movement');
    await user.click(screen.getByText('Extra: quick quiz'));
    expect(screen.getByText(vm.quiz[0].question)).toBeInTheDocument();
  });
});
