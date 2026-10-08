// Web app manifest, generated so its paths respect the base path. Under the
// members proxy (MEMBERS_BASE_PATH) start_url, scope and icons all sit under
// /members/sunday-school/, so Add to Home Screen scopes to the proxied app.
import type { APIRoute } from 'astro';
import { withBase } from '../lib/base';

export const GET: APIRoute = () => {
  const manifest = {
    name: 'Wellington Church of Christ Sunday School',
    short_name: 'Welly Sunday School',
    description: 'Sunday School lessons for the Wellington Church of Christ.',
    start_url: withBase('/'),
    scope: withBase('/'),
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F6F3',
    theme_color: '#1F4A52',
    lang: 'en-NZ',
    icons: [
      { src: withBase('/icons/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { src: withBase('/icons/icon-512.png'), sizes: '512x512', type: 'image/png' },
      {
        src: withBase('/icons/icon-maskable-512.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
