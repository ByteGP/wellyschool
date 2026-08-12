// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Site URL is a placeholder until the Netlify site exists.
// Replace after completing MANUAL_SETUP_NETLIFY_GITHUB.md.
export default defineConfig({
  site: 'https://example.netlify.app',
  output: 'static',
  integrations: [react()],
});
