// Migration for ADR-012: schema v1.2.0 -> v1.2.1.
// Standard 40 -> 35 minutes, Extended 55 -> 45 minutes, labels Short /
// Standard / Extended. Outline minutes are rescaled proportionally; wording
// and structure are untouched. Idempotent: lessons already at 1.2.1 are skipped.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

const NEW_TOTALS = { essential: 25, standard: 35, extended: 45 };
const NEW_LABELS = { essential: 'Short', standard: 'Standard', extended: 'Extended' };

/** Rescale outline minutes to sum exactly to `total`, each step >= 1 minute. */
function rescaleOutline(outline, total) {
  const oldTotal = outline.reduce((sum, step) => sum + step.minutes, 0);
  if (oldTotal === total) return outline.map((step) => ({ ...step }));
  const scaled = outline.map((step) => ({
    ...step,
    minutes: Math.max(1, Math.round((step.minutes * total) / oldTotal)),
  }));
  let diff = total - scaled.reduce((sum, step) => sum + step.minutes, 0);
  // Largest steps absorb the rounding remainder, one minute at a time.
  const bySize = [...scaled].sort((a, b) => b.minutes - a.minutes);
  let index = 0;
  while (diff !== 0) {
    const step = bySize[index % bySize.length];
    const delta = diff > 0 ? 1 : -1;
    if (step.minutes + delta >= 1) {
      step.minutes += delta;
      diff -= delta;
    }
    index += 1;
  }
  return scaled;
}

function bumpMinor(version) {
  const [major, minor] = version.split('.').map(Number);
  return `${major}.${minor + 1}.0`;
}

const lessonsDir = path.join(root, 'src/content/lessons');
const files = fs
  .readdirSync(lessonsDir, { recursive: true })
  .filter((name) => String(name).endsWith('.json'))
  .map((name) => path.join(lessonsDir, String(name)));

let migrated = 0;
for (const file of files) {
  const lesson = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (lesson.schema_version === '1.2.1') {
    console.log(`skip (already 1.2.1): ${path.basename(file)}`);
    continue;
  }
  for (const [key, total] of Object.entries(NEW_TOTALS)) {
    const profile = lesson.teacher.delivery_profiles[key];
    profile.outline = rescaleOutline(profile.outline, total);
    profile.duration_minutes = total;
    profile.label = NEW_LABELS[key];
  }
  lesson.schema_version = '1.2.1';
  lesson.content_version = bumpMinor(lesson.content_version);
  fs.writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`);
  migrated += 1;
  console.log(`migrated: ${path.basename(file)}`);
}
console.log(`Done: ${migrated} lesson(s) migrated.`);
