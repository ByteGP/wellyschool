// Content style rule: ban typographic "AI tells" from lesson content and all
// user-facing source. Runs as part of `npm run validate:content`, so it gates
// every local build and every CI run.
//
// Banned characters:
//   U+2014 em dash   -> rewrite the sentence, or use a comma, period, or colon
//   U+2013 en dash   -> use a plain hyphen
//   U+2026 ellipsis  -> use three periods, or rewrite
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

const BANNED = [
  { char: '—', name: 'em dash (—)', fix: 'rewrite with a comma, period, or colon' },
  { char: '–', name: 'en dash (–)', fix: 'use a plain hyphen' },
  { char: '…', name: 'ellipsis character (…)', fix: 'use three periods or rewrite' },
];

const SCAN_DIRS = ['src'];
const SCAN_EXTENSIONS = new Set(['.json', '.astro', '.tsx', '.ts', '.css', '.js', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro']);
// Generated types mirror the schemas; the schemas themselves are scanned.
const SKIP_FILES = new Set(['lesson.generated.ts']);

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(full);
    if (!entry.isFile() || SKIP_FILES.has(entry.name)) return [];
    return SCAN_EXTENSIONS.has(path.extname(entry.name)) ? [full] : [];
  });

const failures = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(root, dir))) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const rule of BANNED) {
        if (line.includes(rule.char)) {
          failures.push(
            `${path.relative(root, file)}:${index + 1}: ${rule.name}; ${rule.fix}`,
          );
        }
      }
    });
  }
}

if (failures.length > 0) {
  console.error(`Style check failed with ${failures.length} violation(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Style check passed: no banned characters in content or source.');
