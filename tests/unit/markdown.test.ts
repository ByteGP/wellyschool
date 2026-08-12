import { describe, expect, it } from 'vitest';
import { renderResourceMarkdown } from '../../src/lib/content/markdown';

describe('renderResourceMarkdown', () => {
  it('renders headings, tables, and lists from resource bodies', () => {
    const html = renderResourceMarkdown(
      '# Title\n\n| Question | Notes |\n|---|---|\n| Truth? |  |\n\n- one\n- two',
    );
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<table>');
    expect(html).toContain('<li>one</li>');
  });

  it('escapes raw HTML instead of rendering it', () => {
    const html = renderResourceMarkdown('Before <script>alert(1)</script> after');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
