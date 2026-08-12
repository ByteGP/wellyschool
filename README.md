# WellySchool — Sunday School Web MVP

A mobile-first static site that renders two public experiences from one governed
lesson record:

- **Teacher** — a zero-preparation lesson card plus Essential (25), Standard (40),
  and Extended (55) minute delivery profiles, with print views.
- **Family** — a guided 15-minute Connect → Read → Understand → Play → Respond flow.

Built from the *Claude Code Web MVP Build Pack v1.0*. The JSON Schemas, governance
records, and acceptance tests in that pack are authoritative.

**Stack:** Astro 7 (static output, TypeScript strict), React islands where
interaction requires them, Decap CMS (direct GitHub backend), Netlify hosting.
No database, no SSR, no functions, no analytics, no accounts.

## Local development

Requires Node 22.12+ (see `.nvmrc`).

```bash
nvm use              # or install Node 22 any other way
npm ci
npm run dev          # dev server on http://localhost:4321
```

Draft seed content only renders in **preview mode** (see Content modes):

```bash
CONTENT_MODE=preview npm run dev
```

### Quality commands

```bash
npm run validate:content   # schema + governance validation (also runs before build)
npm run check              # astro check (TypeScript strict)
npm run test               # Vitest unit + component tests
npm run test:e2e           # Playwright E2E + axe accessibility checks
npm run build              # validate:content then astro build → dist/
npm run generate:types     # regenerate src/types/*.generated.ts from the schemas
```

The full gate, as CI runs it: `npm ci && npm run check && npm run test && npm run build`.

## Content modes (ADR-011)

| Mode | Lessons rendered | Schedule entries used | Where |
| --- | --- | --- | --- |
| `production` (default) | `approved`, `scheduled`, `published` | `approved` | Netlify production context |
| `preview` | also `vertical_slice_draft`, `in_review` | also `draft` | Deploy Previews, branch deploys, pilot |

Preview builds show a banner, emit `noindex`, and honour a `?today=YYYY-MM-DD`
query override on segment pages for testing date logic. Production ignores the
override and renders only approved content — the six seed lessons will not appear
on production until they pass review and their status is updated through the
editorial workflow.

## Content model

- One JSON file per lesson: `src/content/lessons/{kids,youths,teens}/`
- One JSON file per printable resource: `src/content/resources/`
- One JSON file per schedule date+segment: `src/content/schedule/` (the committed
  entries are draft placeholders — replace via Decap once the church calendar is
  approved)
- Site settings: `src/content/settings/site.json`
- Contracts: `src/schemas/*.schema.json` (v1.2). TypeScript types are generated
  from these (`npm run generate:types`) — never hand-edit `src/types/*.generated.ts`.

Schema changes require an ADR plus a migration script (see `docs/adr/`).

## Editing content (Decap CMS)

`/admin/` hosts Decap CMS with the **direct GitHub backend** (not Git Gateway):

1. Editors sign in with GitHub; they need repository access.
2. Saving a draft creates a content branch and pull request (editorial workflow).
3. Netlify builds a Deploy Preview; the `quality` check validates content.
4. CODEOWNERS review and merge through GitHub — the Decap “Publish” button is
   not the governance authority.

Local CMS testing: run `npx decap-server` alongside `npm run dev`, then open
`http://localhost:4321/admin/` (config has `local_backend: true`).

## Deployment (Netlify)

- Build command `npm run build`, publish `dist/`, Node pinned via `NODE_VERSION`.
- Production deploys only from protected `main` (`CONTENT_MODE=production`).
- Deploy Previews and branch deploys build with `CONTENT_MODE=preview`.
- One-time owner setup (Netlify site, GitHub OAuth app, branch protection,
  CODEOWNERS handles) is documented in the build pack's
  `MANUAL_SETUP_NETLIFY_GITHUB.md`.

### Rollback

Netlify keeps every deploy immutable: open **Deploys**, pick the last good
production deploy, and click **Publish deploy**. For content mistakes, revert the
offending commit on `main` (`git revert <sha>`) through a PR so checks and
reviews still apply.

## Privacy and safeguarding

- No accounts, child profiles, attendance, or analytics; no data leaves the browser.
- Teacher profile/segment preferences: `localStorage` only.
- Family step progress: `sessionStorage` only; Restart clears just that lesson.
- Client islands receive sanitized view models — Family pages never contain
  teacher preparation or editorial metadata (enforced by unit + E2E tests).

## Known limitations

- The six seed lessons are `vertical_slice_draft`; production stays empty until
  the team completes reviews and promotes statuses via the editorial workflow.
- The committed schedule is a draft placeholder (through 2026-09-06); the real
  church calendar must be entered in Decap and approved.
- Decap cannot enforce field-level editorial roles or cross-field rules; GitHub
  CODEOWNERS, branch protection, and CI are the compensating controls.
- E2E tests run locally (and can be added to CI later); the CI `quality` gate
  runs validation, type-check, unit tests, and build.
- No offline support by design (ADR-010); no service worker.
- Branding (name, colors, logo) is placeholder — change the CSS custom
  properties in `src/styles/global.css` and `site.json` after the pilot.

## Release checklist

See `docs/RELEASE_CHECKLIST.md`.
