// @ts-check
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { buildRedirects } from './src/lib/integration/redirects.mjs';

/**
 * After the static build, turn the emitted /l/<date>/<class>.json summary feed
 * into a Netlify `_redirects` file so the church calendar's reminders can link
 * to /l/<date>/<class> (and .../prepare) and land on the right lesson page.
 * Reads the already-built summaries rather than the content loader, so there is
 * no duplicated scheduling logic. See src/lib/integration/.
 */
function lessonRedirects() {
  return {
    name: 'lesson-redirects',
    hooks: {
      'astro:build:done': async (/** @type {{ dir: URL, logger: any }} */ { dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const feedDir = path.join(distDir, 'l');
        const entries = [];
        let dateDirs = [];
        try {
          dateDirs = await readdir(feedDir);
        } catch {
          dateDirs = []; // production mode with no approved lessons: feed is empty
        }
        for (const date of dateDirs) {
          let files = [];
          try {
            files = await readdir(path.join(feedDir, date));
          } catch {
            continue;
          }
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            entries.push(JSON.parse(await readFile(path.join(feedDir, date, file), 'utf-8')));
          }
        }

        const body = buildRedirects(entries);
        const target = path.join(distDir, '_redirects');
        let existing = '';
        try {
          existing = await readFile(target, 'utf-8');
        } catch {
          existing = '';
        }
        await writeFile(target, existing ? `${existing.trimEnd()}\n\n${body}` : body, 'utf-8');
        logger.info(`lesson-redirects: wrote ${entries.length} lesson redirect(s)`);
      },
    },
  };
}

// Production canonical URL: the lesson site's custom domain (TLS live 2026-08).
export default defineConfig({
  site: 'https://sundayschool.wellingtoncoc.com',
  output: 'static',
  integrations: [react(), lessonRedirects()],
});
