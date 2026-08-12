// Deletes files under src/content that are not listed in content-manifest.json.
//
// Why: the pilot push-deploy flow uploads the working tree into a persistent
// remote build workspace, where file deletions do not propagate; stale content
// files from earlier uploads would otherwise silently rejoin the build. The
// deploy preparation step writes content-manifest.json from the clean git
// tree; this script enforces it at the start of validate:content.
//
// When no manifest exists (local development, Git-connected CI, Decap PRs)
// this is a no-op, so the normal workflow is unaffected.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'content-manifest.json');

if (!fs.existsSync(manifestPath)) {
  process.exit(0);
}

const manifest = new Set(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
const contentRoot = path.join(root, 'src/content');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

let pruned = 0;
for (const file of walk(contentRoot)) {
  const relative = path.relative(root, file);
  if (!manifest.has(relative)) {
    fs.rmSync(file);
    pruned += 1;
    console.log(`pruned stale content file: ${relative}`);
  }
}
console.log(pruned === 0 ? 'Content matches manifest.' : `Pruned ${pruned} stale file(s).`);
