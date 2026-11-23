// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeachView from '../../src/components/teacher/TeachView';
import lessonJson from '../../src/content/lessons/kids/k1-l19_jesus_calms_the_storm.json';
import { toTeachViewModel } from '../../src/lib/view-models/teach';
import type { LessonContent } from '../../src/types';

const lesson = lessonJson as unknown as LessonContent;
const vm = toTeachViewModel(lesson, () => true);
const standard = vm.profiles.find((p) => p.name === 'standard')!;
const essential = vm.profiles.find((p) => p.name === 'essential')!;
const STATE_KEY = `wellyschool.teach.${vm.lessonId}`;
const PROFILE_KEY = 'wellyschool.teacher.profile';

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'wakeLock');
});

const start = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Start the lesson' }));
};

describe('TeachView', () => {
  it('opens on a ready screen with the goal, the lengths and safeguarding notes', () => {
    render(<TeachView vm={vm} />);
    expect(screen.getByRole('heading', { level: 1, name: vm.title })).toBeInTheDocument();
    expect(screen.getByText(vm.goal)).toBeInTheDocument();
    const lengths = screen.getByRole('group', { name: 'Choose lesson length' });
    expect(within(lengths).getAllByRole('button')).toHaveLength(3);
    expect(within(lengths).getByRole('button', { name: /35 min/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    for (const item of lesson.safeguarding.do_not_ask) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    // No clocks until the teacher starts.
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('teaches one step at a time, forward and back', async () => {
    const user = userEvent.setup();
    render(<TeachView vm={vm} />);
    await start(user);

    expect(screen.getByRole('heading', { level: 1, name: standard.steps[0].label })).toBeInTheDocument();
    expect(screen.getByText(`Step 1 of ${standard.steps.length} · ${standard.steps[0].minutes} minutes`)).toBeInTheDocument();
    expect(screen.getByText(vm.opening)).toBeInTheDocument();
    expect(screen.getAllByRole('timer')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: `Next: ${standard.steps[1].label}` }));
    expect(screen.getByRole('heading', { level: 1, name: standard.steps[1].label })).toBeInTheDocument();
    expect(screen.queryByText(vm.opening)).not.toBeInTheDocument();
    expect(screen.getByTestId('teach-announcer')).toHaveTextContent(
      `Step 2 of ${standard.steps.length}: ${standard.steps[1].label}`,
    );

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { level: 1, name: standard.steps[0].label })).toBeInTheDocument();
  });

  it('shows the questions and activity that belong to a step, and the closing on the last', async () => {
    const user = userEvent.setup();
    render(<TeachView vm={vm} />);
    await start(user);
    const steps = screen.getByRole('navigation', { name: 'Lesson steps' });

    const withQuestions = standard.steps.findIndex((s) => s.questions.length > 0);
    await user.click(within(steps).getAllByRole('button')[withQuestions]);
    for (const question of standard.steps[withQuestions].questions) {
      expect(screen.getByText(question.question)).toBeInTheDocument();
    }

    const withActivity = standard.steps.findIndex((s) => s.activities.length > 0);
    await user.click(within(steps).getAllByRole('button')[withActivity]);
    expect(
      screen.getByRole('heading', { name: new RegExp(standard.steps[withActivity].activities[0].title) }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /opens in a new tab/ })).toHaveAttribute(
      'href',
      standard.steps[withActivity].resources[0].href,
    );

    await user.click(within(steps).getAllByRole('button')[standard.steps.length - 1]);
    expect(screen.getByRole('heading', { name: 'Close the class' })).toBeInTheDocument();
    expect(screen.getByText(vm.closing.takeHomeLine)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument();
  });

  it('uses the chosen lesson length and remembers it', async () => {
    const user = userEvent.setup();
    render(<TeachView vm={vm} />);
    await user.click(screen.getByRole('button', { name: /25 min/ }));
    expect(window.localStorage.getItem(PROFILE_KEY)).toBe('essential');
    await start(user);
    const steps = screen.getByRole('navigation', { name: 'Lesson steps' });
    expect(within(steps).getAllByRole('button')).toHaveLength(essential.steps.length);
    expect(screen.getByRole('timer', { name: /(25 minutes|24 minutes 5\d seconds) left in the lesson/ })).toBeInTheDocument();
  });

  it('picks up the length chosen on the lesson page', async () => {
    window.localStorage.setItem(PROFILE_KEY, 'extended');
    render(<TeachView vm={vm} />);
    expect(await screen.findByRole('button', { name: /45 min/, pressed: true })).toBeInTheDocument();
  });

  it('counts down, shows a step running over, and never moves on by itself', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TeachView vm={vm} />);
    await start(user);
    const first = standard.steps[0];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });
    expect(
      screen.getByRole('timer', { name: new RegExp(`${first.minutes - 2} minutes 59 seconds left in this step`) }),
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(first.minutes * 60_000);
    });
    expect(screen.getByRole('timer', { name: /This step is 1 minute 1 second over/ })).toBeInTheDocument();
    expect(screen.getByText('over on this step')).toBeInTheDocument();
    expect(screen.getByTestId('teach-announcer')).toHaveTextContent(`Time for ${first.label} is up`);
    // Still on the same step: the clock guides, it does not drive.
    expect(screen.getByRole('heading', { level: 1, name: first.label })).toBeInTheDocument();
    expect(screen.getByText('About 1 minute behind')).toBeInTheDocument();
  });

  it('pauses and resumes the clock', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TeachView vm={vm} />);
    await start(user);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await user.click(screen.getByRole('button', { name: 'Pause the clock' }));
    expect(screen.getByText('Paused')).toBeInTheDocument();
    const frozen = screen.getAllByRole('timer')[0].getAttribute('aria-label');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    expect(screen.getAllByRole('timer')[0]).toHaveAttribute('aria-label', frozen);
    await user.click(screen.getByRole('button', { name: 'Resume the clock' }));
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
  });

  it('finishes with the take-home line and no scores', async () => {
    const user = userEvent.setup();
    render(<TeachView vm={vm} />);
    await start(user);
    for (let i = 0; i < standard.steps.length - 1; i += 1) {
      await user.click(screen.getByRole('button', { name: /^Next: / }));
    }
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Lesson finished' })).toBeInTheDocument();
    expect(screen.getByText(vm.closing.takeHomeLine)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the Kids class page' })).toHaveAttribute(
      'href',
      '/teacher/kids/',
    );
    const text = (document.body.textContent ?? '').toLowerCase();
    for (const banned of ['points', 'streak', 'score', 'badge', 'leaderboard']) {
      expect(text).not.toContain(banned);
    }
    await user.click(screen.getByRole('button', { name: 'Start again' }));
    expect(screen.getByRole('button', { name: 'Start the lesson' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(STATE_KEY)).toBeNull();
  });

  it('turns the page with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<TeachView vm={vm} />);
    await start(user);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { level: 1, name: standard.steps[1].label })).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('heading', { level: 1, name: standard.steps[0].label })).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('heading', { level: 1, name: standard.steps[0].label })).toBeInTheDocument();
  });

  it('keeps its place in this tab if the page reloads mid-class', async () => {
    const user = userEvent.setup();
    const first = render(<TeachView vm={vm} />);
    await start(user);
    await user.click(screen.getByRole('button', { name: /^Next: / }));
    first.unmount();

    render(<TeachView vm={vm} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: standard.steps[1].label }),
    ).toBeInTheDocument();
  });

  it('ignores a saved lesson from another day or a damaged one', async () => {
    const old = Date.now() - 5 * 60 * 60_000;
    window.sessionStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        profile: 'standard',
        phase: 'teaching',
        step: 2,
        clock: { startedAt: old, pausedAt: null, pausedTotal: 0, stepEnteredAt: 0 },
      }),
    );
    const first = render(<TeachView vm={vm} />);
    expect(await screen.findByRole('button', { name: 'Start the lesson' })).toBeInTheDocument();
    first.unmount();

    window.sessionStorage.setItem(STATE_KEY, '{not json');
    render(<TeachView vm={vm} />);
    expect(await screen.findByRole('button', { name: 'Start the lesson' })).toBeInTheDocument();
  });

  it('asks the device to keep the screen on while teaching, and lets go at the end', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    const user = userEvent.setup();
    render(<TeachView vm={vm} />);
    expect(await screen.findByText('The screen stays on while you teach.')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
    await start(user);
    expect(request).toHaveBeenCalledWith('screen');
    for (let i = 0; i < standard.steps.length; i += 1) {
      await user.click(screen.getByRole('button', { name: /^(Next: |Finish)/ }));
    }
    expect(release).toHaveBeenCalled();
  });

  it('says so plainly when the device cannot keep the screen on', async () => {
    render(<TeachView vm={vm} />);
    expect(await screen.findByText(/This device may dim the screen/)).toBeInTheDocument();
  });
});
