import { describe, expect, it } from 'vitest';
import { logKey, passcodeMatches, validateUpdate } from '../../src/lib/teaching-log';

describe('logKey', () => {
  it('keys by date and segment', () => {
    expect(logKey('2026-08-16', 'Kids')).toBe('2026-08-16__Kids');
  });
});

describe('validateUpdate', () => {
  it('accepts a taught entry', () => {
    const result = validateUpdate({ date: '2026-08-16', segment: 'Kids', status: 'taught' });
    expect(result).toEqual({
      ok: true,
      entry: { date: '2026-08-16', segment: 'Kids', status: 'taught' },
    });
  });

  it('accepts a swap with a valid lesson id and trims a note', () => {
    const result = validateUpdate({
      date: '2026-08-16',
      segment: 'Teens',
      status: 'swapped',
      actual_lesson_id: 'T2-L05',
      note: '  ran a guest speaker  ',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.actual_lesson_id).toBe('T2-L05');
      expect(result.entry.note).toBe('ran a guest speaker');
    }
  });

  it('rejects a bad date, segment, status, and swap without a lesson', () => {
    expect(validateUpdate({ date: 'nope', segment: 'Kids', status: 'taught' }).ok).toBe(false);
    expect(validateUpdate({ date: '2026-08-16', segment: 'Adults', status: 'taught' }).ok).toBe(
      false,
    );
    expect(validateUpdate({ date: '2026-08-16', segment: 'Kids', status: 'maybe' }).ok).toBe(false);
    const swap = validateUpdate({ date: '2026-08-16', segment: 'Kids', status: 'swapped' });
    expect(swap.ok).toBe(false);
  });

  it('rejects an over-long note', () => {
    const result = validateUpdate({
      date: '2026-08-16',
      segment: 'Kids',
      status: 'taught',
      note: 'x'.repeat(501),
    });
    expect(result.ok).toBe(false);
  });
});

describe('passcodeMatches', () => {
  it('matches the exact passcode only', () => {
    expect(passcodeMatches('open-sesame', 'open-sesame')).toBe(true);
    expect(passcodeMatches('wrong', 'open-sesame')).toBe(false);
    expect(passcodeMatches('open-sesam', 'open-sesame')).toBe(false);
  });

  it('refuses writes when no passcode is configured', () => {
    expect(passcodeMatches('anything', undefined)).toBe(false);
    expect(passcodeMatches('anything', '')).toBe(false);
  });

  it('ignores non-string input', () => {
    expect(passcodeMatches(12345, 'open-sesame')).toBe(false);
    expect(passcodeMatches(undefined, 'open-sesame')).toBe(false);
  });
});
