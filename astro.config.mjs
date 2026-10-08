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

        const base = process.env.MEMBERS_BASE_PATH || '/';
        const body = buildRedirects(entries, base);

        // Under the members proxy, the Netlify site must answer at the base
        // path: route api/teaching-log to the function, then serve the flat
        // dist for everything else. Catch-all must stay last. Inert at '/'.
        let proxyRules = '';
        if (base !== '/') {
          const b = base.replace(/\/$/, '');
          // The teaching-log function registers its own path (/api/teaching-log
          // via config.path), so route the base path to that, not to
          // /.netlify/functions/. Catch-all serves the flat dist and must stay
          // last.
          proxyRules = [
            '',
            '# Members proxy: serve this app under the base path.',
            `${b}/api/teaching-log\t/api/teaching-log\t200`,
            `${b}/*\t/:splat\t200`,
            '',
          ].join('\n');
        }

        const target = path.join(distDir, '_redirects');
        let existing = '';
        try {
          existing = await readFile(target, 'utf-8');
        } catch {
          existing = '';
        }
        const prefix = existing ? `${existing.trimEnd()}\n\n` : '';
        await writeFile(target, `${prefix}${body}${proxyRules}`, 'utf-8');
        logger.info(`lesson-redirects: wrote ${entries.length} lesson redirect(s)`);
      },
    },
  };
}

// Production canonical URL: the lesson site's custom domain (TLS live 2026-08).
//
// Base path: '/' for the standalone site (sundayschool.wellingtoncoc.com), or
// '/members/sunday-school' when built for the members-area proxy on the main
// site. MEMBERS_BASE_PATH is set in that build only; the default leaves the
// standalone site unchanged. See docs/members-proxy.md.
const base = process.env.MEMBERS_BASE_PATH || '/';

export default defineConfig({
  site: 'https://sundayschool.wellingtoncoc.com',
  base,
  output: 'static',
  integrations: [react(), lessonRedirects()],
});
