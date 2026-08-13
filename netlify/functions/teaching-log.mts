// Shared teaching-log endpoint (ADR-013, Phase B).
//
//   GET  /api/teaching-log            -> { entries: TeachingLogEntry[] }
//   POST /api/teaching-log            -> upsert one entry (passcode-gated)
//
// Storage is a Netlify Blobs store; each Sunday+segment is one key. Reads are
// open (operational data, no child info); writes require the shared teacher
// passcode in the `x-teaching-passcode` header, checked against the
// TEACHING_LOG_PASSCODE environment variable. Public teacher/parent/lesson
// pages stay static; only this log read/write is dynamic.
import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';
import {
  logKey,
  passcodeMatches,
  validateUpdate,
  type TeachingLogEntry,
} from '../../src/lib/teaching-log.ts';

const STORE = 'teaching-log';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export default async function handler(request: Request, _context: Context): Promise<Response> {
  const store = getStore(STORE);

  if (request.method === 'GET') {
    const { blobs } = await store.list();
    const entries = (
      await Promise.all(blobs.map((blob) => store.get(blob.key, { type: 'json' })))
    ).filter(Boolean) as TeachingLogEntry[];
    entries.sort((a, b) => a.date.localeCompare(b.date) || a.segment.localeCompare(b.segment));
    return json({ entries });
  }

  if (request.method === 'POST') {
    const expected = process.env.TEACHING_LOG_PASSCODE;
    const supplied = request.headers.get('x-teaching-passcode');
    if (!passcodeMatches(supplied, expected)) {
      return json({ error: 'Incorrect or missing teacher passcode.' }, 401);
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Body must be JSON.' }, 400);
    }

    const result = validateUpdate(payload as Record<string, unknown>);
    if (!result.ok) return json({ error: result.error }, 400);

    const entry: TeachingLogEntry = { ...result.entry, updated_at: new Date().toISOString() };
    await store.setJSON(logKey(entry.date, entry.segment), entry);
    return json({ entry });
  }

  return json({ error: 'Method not allowed.' }, 405);
}

export const config: Config = {
  path: '/api/teaching-log',
};
