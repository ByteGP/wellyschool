# Members proxy: serving the Sunday School site under /members/sunday-school/

Phase 2 of the members platform (website repo `docs/members-build-brief.md`)
serves this site inside the main site at
`wellingtoncoc.com/members/sunday-school/`, behind a members-only proxy, so the
whole `/members/...` area is one origin and the Supabase session is shared.
Nothing on `sundayschool.wellingtoncoc.com` changes until Eugene's post-launch
cutover; this is all branch and deploy-preview work.

## How a request flows

1. A signed-in member opens `wellingtoncoc.com/members/sunday-school/<path>`.
2. The website's edge function (`netlify/edge-functions/members-sunday-school.ts`
   in the website repo) checks the member is active, then fetches
   `<this origin>/members/sunday-school/<path>` and adds the header
   `x-members-proxy: <MEMBERS_PROXY_SECRET>`.
3. This site answers at the base path and returns the page.

## What this repo does

- **Base path.** `astro.config.mjs` reads `base` from `MEMBERS_BASE_PATH`
  (default `/`). Set it to `/members/sunday-school` to build the proxied
  variant. The standalone build (no env var) is unchanged.
- **Links.** Astro prefixes its own asset imports with the base, but not
  hand-written `href`/`src` strings or paths we emit to JSON/redirects. Every
  one of those goes through `withBase()` (`src/lib/base.ts`). Website links in
  the shared header stay root-relative on purpose (they resolve against the main
  site), so they are *not* wrapped.
- **Serving.** Astro's static output is flat (not nested under the base), so the
  build appends two rules to `_redirects` when `MEMBERS_BASE_PATH` is set:
  `/members/sunday-school/api/teaching-log` to the teaching-log function, then a
  catch-all `/members/sunday-school/* /:splat 200` (kept last) that serves the
  flat `dist` under the base.
- **teaching-log.** The island fetches `${import.meta.env.BASE_URL}api/teaching-log`,
  so it is correct in both builds. The passcode is unchanged.
- **Header.** When built for the base path, `BaseLayout` renders
  `MembersShell.astro` (the website header + members sub-nav, from the website's
  `docs/members-shell.md`) instead of the app's compact header.
- **Origin lock.** `netlify/edge-functions/origin-lock.ts` runs on `/*`. When
  `MEMBERS_PROXY_SECRET` is set, it serves only requests carrying the matching
  `x-members-proxy` header and redirects any direct hit to the members entrance.
  With the secret unset it is inert, so it is safe to deploy before the secret
  is configured, and deploy previews stay viewable.

## Environment variables

| Var | Where | Purpose |
| --- | --- | --- |
| `MEMBERS_BASE_PATH` | build | `/members/sunday-school` for the proxied build; unset (= `/`) for standalone. |
| `MEMBERS_PROXY_SECRET` | runtime (edge) | Shared secret, same value on both sites, set by Eugene. Enables the origin lock. |

`netlify.toml` sets `MEMBERS_BASE_PATH` only for this feature branch's deploys,
so the branch deploy answers at the base path while production stays standalone.

## Deploying the proxy origin for real

For Phase 2 testing the branch deploy serves the base build. How the base build
becomes the permanent proxy origin at cutover (a dedicated site, or repointing
the production build) is a deployment decision for Eugene and the members-platform
session; the build is already base-capable via `MEMBERS_BASE_PATH`.

## Cross-app note

The `/l/<date>/<class>` calendar deep-links and the `lessons-index.json` feed are
base-aware too, so they are internally consistent under the proxy. The calendar
app that consumes them is a separate origin and its own move under `/members`
is tracked by that session; nothing here changes its current root-origin links.
