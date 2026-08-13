// Pure builder for the Netlify `_redirects` body that powers the calendar
// integration. Kept dependency-free (plain .mjs) so both the Astro build
// integration and the unit tests can import it without the Vite/Astro module
// graph.

/** The lesson-site class slugs that always get a safe fallback redirect. */
export const FALLBACK_SLUGS = ['kids', 'youths', 'teens'];

/**
 * Build a Netlify `_redirects` file body from lesson-link summaries.
 *
 * Layout (order matters, Netlify uses first match):
 *   1. Exact `/l/<date>/<class>` and `/l/<date>/<class>/prepare` rules (301)
 *      pointing at the specific lesson page (and its Prepare section).
 *   2. Per-class fallbacks `/l/:date/<class>` (302) so any date without a
 *      scheduled lesson still resolves to that class's landing page instead of
 *      404ing. This keeps every reminder URL safe even before a lesson exists.
 *
 * @param {Array<{date:string,class:string,lessonPath:string,preparePath:string}>} entries
 * @returns {string}
 */
export function buildRedirects(entries) {
  const sorted = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.class.localeCompare(b.class),
  );

  const lines = [
    '# AUTO-GENERATED at build time by the lesson-redirects integration.',
    '# Source: astro.config.mjs -> astro:build:done. Do not edit by hand.',
    '# Maps calendar reminder URLs /l/<date>/<class>[/prepare] to lesson pages.',
    '',
  ];

  for (const entry of sorted) {
    lines.push(`/l/${entry.date}/${entry.class}\t${entry.lessonPath}\t301`);
    lines.push(`/l/${entry.date}/${entry.class}/prepare\t${entry.preparePath}\t301`);
  }

  lines.push('');
  for (const slug of FALLBACK_SLUGS) {
    lines.push(`/l/:date/${slug}\t/teacher/${slug}/\t302`);
    lines.push(`/l/:date/${slug}/prepare\t/teacher/${slug}/\t302`);
  }
  lines.push('');

  return lines.join('\n');
}
