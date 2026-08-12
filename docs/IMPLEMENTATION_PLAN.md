# Implementation Plan

Derived from Claude Code Web MVP Build Pack v1.0. The pack's build brief, schemas,
governance records, and acceptance tests are authoritative.

## Locked versions

| Dependency | Version | Note |
| --- | --- | --- |
| Node | 22.23.2 | Astro 7 requires Node >= 22.12 (`.nvmrc`, Netlify `NODE_VERSION`) |
| Astro | 7.2.1 | current stable at implementation time, static output |
| @astrojs/react | 6.0.2 | React islands only |
| React | 19.2.8 | stepper, quiz/puzzle, profile + segment preference islands |
| TypeScript | 5.9.3 | strict mode; TS 7 not yet supported by @astrojs/check |
| Decap CMS | ^3.0.0 (CDN) | `/admin/` static app, direct GitHub backend |
| Ajv | 8.20.0 | supplied validator |
| Vitest | 4.1.10 | unit + component tests |
| Playwright | 1.62.1 | E2E + axe accessibility checks |

All versions pinned exactly in `package-lock.json`.

## Phases

1. **Scaffold** — Astro + TS strict + React integration; starter files copied verbatim;
   `check` / `validate:content` / `test` / `test:e2e` / `build` scripts; validation gates build.
2. **Content** — types generated from JSON Schema (`npm run generate:types`, committed);
   static content loaders; supplied validator wired to prebuild and CI; corruption tests.
3. **Schedule** — Pacific/Auckland date utilities; Teacher next-entry and Family
   latest-entry selection; break/special entries; placeholder draft schedule (ADR-011).
4. **Teacher** — mobile-first route order per brief §9; zero-prep card; profile selector
   with no-JS Standard fallback; print route with dedicated CSS.
5. **Family** — five-step 15-minute stepper; all quiz/puzzle renderers keyed off
   `answer.kind` / `solution.kind`; session-storage-only progress; print route.
6. **CMS** — supplied `config.yml` with real repo slug; admin no-store/noindex headers.
7. **Hardening** — WCAG 2.2 AA behaviors, Playwright + axe, bundle redaction checks,
   README, release checklist, known limitations.
8. **Manual (owner)** — GitHub branch protection, Netlify site + OAuth provider
   (`MANUAL_SETUP_NETLIFY_GITHUB.md`), pilot, release.

## Blockers identified

None for the local build. Owner actions required before production:
Netlify site creation, GitHub OAuth app + Netlify auth provider, branch protection,
CODEOWNERS handles, congregation branding, and church calendar approval (real
schedule entries). Placeholders are used per the handoff instruction.

## Deviations recorded

- **ADR-011** (`docs/adr/ADR-011-preview-content-mode.md`): seed lessons ship as
  `vertical_slice_draft`, but production may render only approved+ statuses. A
  build-time content mode gates which statuses render; the pilot uses preview mode.
- `scripts/validate-content.mjs`: Ajv option `strictRequired: false` added because the
  supplied schedule-entry schema uses conditional `required` inside `allOf/then`,
  which Ajv strict mode flags as a style error. Validation semantics unchanged.
