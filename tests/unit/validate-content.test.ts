// Integration tests for the supplied content validator: the real content must
// pass, and deliberate corruptions must fail the build (never downgraded to
// warnings). Each case copies the repo content into a temp dir, corrupts one
// thing, and runs the actual script.
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const tempDirs: string[] = [];

function makeContentCopy(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'wellyschool-validate-'));
  tempDirs.push(dir);
  for (const sub of ['src/schemas', 'src/content', 'docs/governance', 'scripts']) {
    cpSync(path.join(repoRoot, sub), path.join(dir, sub), { recursive: true });
  }
  symlinkSync(path.join(repoRoot, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return dir;
}

function runValidator(cwd: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync(process.execPath, ['scripts/validate-content.mjs'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, output };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
}

const lessonPath = 'src/content/lessons/kids/k1-l19_jesus_calms_the_storm.json';

function corruptLesson(dir: string, mutate: (lesson: any) => void): void {
  const file = path.join(dir, lessonPath);
  const lesson = JSON.parse(readFileSync(file, 'utf8'));
  mutate(lesson);
  writeFileSync(file, JSON.stringify(lesson, null, 2));
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('validate-content.mjs', () => {
  it('passes on the real repository content', () => {
    const result = runValidator(repoRoot);
    expect(result.output).toContain('Content validation passed');
    expect(result.ok).toBe(true);
  });

  it('fails when a required field is removed (schema violation)', () => {
    const dir = makeContentCopy();
    corruptLesson(dir, (lesson) => delete lesson.core.big_idea);
    const result = runValidator(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('big_idea');
  });

  it('fails when a delivery profile no longer totals its minutes', () => {
    const dir = makeContentCopy();
    corruptLesson(dir, (lesson) => {
      lesson.teacher.delivery_profiles.standard.outline[0].minutes = 1;
    });
    const result = runValidator(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('standard profile must total 35 minutes');
  });

  it('fails when the family flow order is altered', () => {
    const dir = makeContentCopy();
    corruptLesson(dir, (lesson) => {
      const flow = lesson.family.flow;
      [flow[0], flow[1]] = [flow[1], flow[0]];
    });
    const result = runValidator(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('family flow order is invalid');
  });

  it('fails when a quiz answer kind mismatches its question type', () => {
    const dir = makeContentCopy();
    corruptLesson(dir, (lesson) => {
      lesson.engagement.quiz[2].answer = { kind: 'text', text: 'false' };
    });
    const result = runValidator(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('expected answer kind boolean');
  });

  it('fails when an outline references a missing resource', () => {
    const dir = makeContentCopy();
    corruptLesson(dir, (lesson) => {
      lesson.teacher.delivery_profiles.standard.outline[4].resource_refs = ['K1-L19-P99-missing'];
    });
    const result = runValidator(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('unresolved resource ref');
  });

  it('fails when curriculum identity drifts from the canonical matrix', () => {
    const dir = makeContentCopy();
    corruptLesson(dir, (lesson) => {
      lesson.curriculum.title = 'A Different Title';
    });
    const result = runValidator(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('curriculum.title mismatch');
  });

  // The schedule is auto-generated (ADR-013); explicit override files are still
  // validated. These tests author an override file to exercise those rules.
  const overrideEntry = (overrides: Record<string, unknown>) => ({
    schedule_id: '2026-08-16-kids',
    date: '2026-08-16',
    segment: 'Kids',
    entry_type: 'lesson',
    lesson_id: 'K1-L19',
    status: 'draft',
    ...overrides,
  });

  it('fails when an approved schedule override references a draft lesson', () => {
    const dir = makeContentCopy();
    // Force the referenced lesson to a draft so the rule has something to catch
    // (the real curriculum is all approved post go-live, ADR-015).
    corruptLesson(dir, (lesson) => {
      lesson.status = 'in_review';
    });
    writeFileSync(
      path.join(dir, 'src/content/schedule/2026-08-16-kids.json'),
      JSON.stringify(overrideEntry({ status: 'approved' }), null, 2),
    );
    const result = runValidator(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('approved schedule cannot reference lesson status');
  });

  it('fails on duplicate date-and-segment schedule overrides', () => {
    const dir = makeContentCopy();
    writeFileSync(
      path.join(dir, 'src/content/schedule/2026-08-16-kids.json'),
      JSON.stringify(overrideEntry({}), null, 2),
    );
    writeFileSync(
      path.join(dir, 'src/content/schedule/2026-08-16-kids-duplicate.json'),
      JSON.stringify(overrideEntry({}), null, 2),
    );
    const result = runValidator(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('duplicate schedule key');
  });

  it('fails when a lesson claims approved status without completed reviews', () => {
    const dir = makeContentCopy();
    corruptLesson(dir, (lesson) => {
      lesson.status = 'approved';
      // Reopen the review gate so approved status is unjustified (the real
      // lessons carry completed sign-offs post go-live, ADR-015).
      lesson.editorial.review_state = {
        exegetical: 'in_review',
        developmental: 'in_review',
        pastoral: 'not_required',
        copy: 'in_review',
      };
    });
    const result = runValidator(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('requires completed');
  });
});
