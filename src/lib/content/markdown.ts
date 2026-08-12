// Renders printable-resource body_markdown to HTML with raw HTML disabled.
// Content is repo-governed (no raw HTML fields in the CMS), but escaping HTML
// tokens keeps the print route safe even if markup slips into a JSON body.
import { Marked } from 'marked';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
  },
});

export function renderResourceMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false });
}
